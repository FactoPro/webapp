'use server'

import { revalidatePath } from 'next/cache'

import { sendInvoiceToClient } from '@/lib/email/invoice-email'
import { renderAndStoreInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { createClient as createSupabaseClient } from '@/lib/server'

export type InvoiceActionResult = { ok: true; id: string } | { ok: false; error: string }

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Régénère le PDF de la facture depuis son état courant et met à jour `pdf_url` (best-effort). */
async function refreshInvoicePdf(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  invoiceId: string
): Promise<string | null> {
  const [{ data: invoice }, { data: user }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle(),
    supabase.auth.getUser(),
  ])
  if (!invoice || !user.user) return null

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.user.id).maybeSingle(),
    invoice.client_id
      ? supabase
          .from('clients')
          .select('name, company_name, siret, address, email')
          .eq('id', invoice.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!profile) return null

  const url = await renderAndStoreInvoicePdf(supabase, invoice, profile, client ?? null)
  if (url) await supabase.from('invoices').update({ pdf_url: url }).eq('id', invoiceId)
  return url
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

/**
 * Finalise une facture `draft` → `sent` en lui attribuant son numéro légal
 * séquentiel `FAC-AAAA-NNN` (FAC-31). Le numéro est attribué une seule fois,
 * de façon atomique côté Postgres (`next_document_number`), et n'est jamais
 * réattribué : une facture numérotée ne peut plus être supprimée, seulement
 * annulée par un avoir (FAC-30).
 */
export async function markInvoiceSent(id: string): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, number, kind, client_id, user_id')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }
  if (invoice.status !== 'draft') {
    return { ok: false, error: 'Seule une facture en brouillon peut être finalisée.' }
  }

  let number = invoice.number
  if (!number) {
    const isCredit = invoice.kind === 'credit_note'
    const { data: generated, error: numError } = await supabase.rpc('next_document_number', {
      p_doc_type: isCredit ? 'credit_note' : 'invoice',
      p_prefix: isCredit ? 'AV' : 'FAC',
    })
    if (numError || !generated) return { ok: false, error: 'La numérotation a échoué.' }
    number = generated
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'sent', number, sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: 'La finalisation a échoué.' }

  // PDF + email : best-effort, ne doivent jamais faire échouer la finalisation.
  const pdfUrl = await refreshInvoicePdf(supabase, id)
  const [{ data: client }, { data: profile }] = await Promise.all([
    invoice.client_id
      ? supabase.from('clients').select('email').eq('id', invoice.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('profiles')
      .select('company_name, first_name, last_name')
      .eq('id', invoice.user_id)
      .maybeSingle(),
  ])
  if (client?.email) {
    const issuerName =
      profile?.company_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      'Votre artisan'
    await sendInvoiceToClient({
      to: client.email,
      issuerName,
      invoiceNumber: number,
      isCreditNote: invoice.kind === 'credit_note',
      pdfUrl,
    })
  }

  revalidatePath('/factures')
  revalidatePath(`/factures/${id}`)
  return { ok: true, id }
}

/** Régénère le PDF d'une facture (action artisan explicite). */
export async function regenerateInvoicePdf(id: string): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }
  if (invoice.status === 'draft') {
    return { ok: false, error: 'Finalisez la facture pour générer son PDF.' }
  }
  const url = await refreshInvoicePdf(supabase, id)
  if (!url) return { ok: false, error: 'La génération du PDF a échoué.' }
  revalidatePath(`/factures/${id}`)
  return { ok: true, id }
}

export async function deleteInvoice(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status, number')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }
  if (invoice.number) {
    return {
      ok: false,
      error: 'Une facture numérotée ne peut pas être supprimée — créez un avoir pour l’annuler.',
    }
  }
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
