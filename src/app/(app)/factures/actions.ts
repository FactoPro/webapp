'use server'

import { revalidatePath } from 'next/cache'

import { createClient as createSupabaseClient } from '@/lib/server'

export type InvoiceActionResult = { ok: true; id: string } | { ok: false; error: string }

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Convertit un devis accepté en facture `draft` (FAC-28).
 * - copie client / projet / lignes / remise / totaux à l'identique ;
 * - lien `quote_id` conservé ;
 * - échéance = aujourd'hui + `profiles.payment_terms` ;
 * - idempotent : si une facture (`kind = 'invoice'`) existe déjà pour ce devis,
 *   on la renvoie sans en créer une seconde.
 */
export async function convertQuoteToInvoice(quoteId: string): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle()
  if (!quote) return { ok: false, error: 'Devis introuvable.' }
  if (quote.status !== 'accepted') {
    return { ok: false, error: 'Seul un devis accepté peut être converti en facture.' }
  }

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('quote_id', quoteId)
    .eq('kind', 'invoice')
    .maybeSingle()
  if (existing) return { ok: true, id: existing.id }

  const { data: profile } = await supabase
    .from('profiles')
    .select('payment_terms')
    .eq('id', user.id)
    .maybeSingle()

  const { data: inserted, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      client_id: quote.client_id,
      quote_id: quote.id,
      project_id: quote.project_id,
      kind: 'invoice',
      status: 'draft',
      title: quote.title,
      items: quote.items,
      subtotal: quote.subtotal,
      discount_kind: quote.discount_kind,
      discount_value: quote.discount_value,
      discount_label: quote.discount_label,
      discount_amount: quote.discount_amount,
      vat_amount: quote.vat_amount,
      total: quote.total,
      due_date: addDays(profile?.payment_terms ?? 30),
      notes: quote.notes,
    })
    .select('id')
    .single()
  if (error || !inserted) return { ok: false, error: 'La conversion a échoué.' }

  revalidatePath('/factures')
  revalidatePath(`/devis/${quoteId}`)
  return { ok: true, id: inserted.id }
}

export async function deleteInvoice(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }
  if (invoice.status === 'paid' || invoice.status === 'partial') {
    return {
      ok: false,
      error: 'Une facture avec un paiement enregistré ne peut pas être supprimée.',
    }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }
  revalidatePath('/factures')
  return { ok: true }
}
