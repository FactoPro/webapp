'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { computeTotals } from '@/lib/calculations'
import { sendQuoteToClient } from '@/lib/email/quote-email'
import { renderAndStoreQuotePdf } from '@/lib/pdf/quote-pdf'
import { canTransition } from '@/lib/quote-status'
import { createClient as createSupabaseClient } from '@/lib/server'
import { parseAmount, type QuoteInput, quoteSchema, resolveDiscount } from '@/lib/validations/quote'

export type QuoteActionResult = { ok: true; id: string } | { ok: false; error: string }

/** Régénère le PDF du devis depuis l'état courant et met à jour `pdf_url` (best-effort). */
async function refreshQuotePdf(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  quoteId: string
): Promise<string | null> {
  const [{ data: quote }, { data: user }] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle(),
    supabase.auth.getUser(),
  ])
  if (!quote || !user.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user.id)
    .maybeSingle()
  if (!profile) return null

  const url = await renderAndStoreQuotePdf(supabase, quote, profile)
  if (url) await supabase.from('quotes').update({ pdf_url: url }).eq('id', quoteId)
  return url
}

export async function saveQuote(values: QuoteInput, id?: string): Promise<QuoteActionResult> {
  const parsed = quoteSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const data = parsed.data

  const { data: presets } = await supabase.from('discounts').select('id, kind, value, label')
  const discount = resolveDiscount(data, presets ?? [])

  const items = data.items.map((item) => ({
    label: item.label,
    quantity: parseAmount(item.quantity),
    unit: item.unit,
    unit_price: parseAmount(item.unit_price),
    vat_rate: parseAmount(item.vat_rate),
    catalog_item_id: item.catalog_item_id ?? null,
  }))

  const totals = computeTotals(items, discount.kind, discount.value)

  const row = {
    user_id: user.id,
    client_id: data.client_id,
    title: data.title || null,
    description: data.description || null,
    valid_until: data.valid_until || null,
    notes: data.notes || null,
    items,
    discount_kind: discount.kind,
    discount_value: discount.value,
    discount_label: discount.label,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    vat_amount: totals.vatAmount,
    total: totals.total,
  }

  if (id) {
    const { data: existing } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', id)
      .maybeSingle()
    if (existing && existing.status !== 'draft') {
      return {
        ok: false,
        error: 'Ce devis a été envoyé. Repassez-le en brouillon pour le modifier.',
      }
    }
    const { error } = await supabase.from('quotes').update(row).eq('id', id)
    if (error) return { ok: false, error: "L'enregistrement a échoué." }
    revalidatePath('/devis')
    revalidatePath(`/devis/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await supabase
    .from('quotes')
    .insert({ ...row, status: 'draft' })
    .select('id')
    .single()
  if (error || !inserted) return { ok: false, error: 'La création a échoué.' }

  revalidatePath('/devis')
  return { ok: true, id: inserted.id }
}

export async function deleteQuote(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }
  revalidatePath('/devis')
  return { ok: true }
}

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : ''
}

/**
 * draft → sent : attribue le numéro DEV-YYYY-NNN (FAC-24), passe le devis en
 * `sent`, génère le PDF et l'envoie au client par email (FAC-27, best-effort).
 */
export async function sendQuote(id: string): Promise<QuoteActionResult> {
  const supabase = await createSupabaseClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, number, client_id, public_token, user_id')
    .eq('id', id)
    .maybeSingle()
  if (!quote) return { ok: false, error: 'Devis introuvable.' }
  if (!canTransition(quote.status, 'sent')) {
    return { ok: false, error: 'Seul un brouillon peut être envoyé.' }
  }
  if (!quote.client_id) return { ok: false, error: 'Sélectionnez un client avant d’envoyer.' }

  let number = quote.number
  if (!number) {
    const { data: generated, error: numError } = await supabase.rpc('next_document_number', {
      p_doc_type: 'quote',
      p_prefix: 'DEV',
    })
    if (numError || !generated) return { ok: false, error: 'La numérotation a échoué.' }
    number = generated
  }

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'sent', number, sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: "L'envoi a échoué." }

  // PDF + email : best-effort, ne doivent jamais faire échouer l'envoi.
  const pdfUrl = await refreshQuotePdf(supabase, id)
  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase.from('clients').select('email').eq('id', quote.client_id).maybeSingle(),
    supabase
      .from('profiles')
      .select('company_name, first_name, last_name')
      .eq('id', quote.user_id)
      .maybeSingle(),
  ])
  if (client?.email) {
    const issuerName =
      profile?.company_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      'Votre artisan'
    await sendQuoteToClient({
      to: client.email,
      issuerName,
      quoteNumber: number,
      publicUrl: `${await siteOrigin()}/devis/public/${quote.public_token}`,
      pdfUrl,
    })
  }

  revalidatePath('/devis')
  revalidatePath(`/devis/${id}`)
  return { ok: true, id }
}

/** Régénère le PDF d'un devis (action artisan explicite). */
export async function regenerateQuotePdf(id: string): Promise<QuoteActionResult> {
  const supabase = await createSupabaseClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()
  if (!quote) return { ok: false, error: 'Devis introuvable.' }
  if (quote.status === 'draft') {
    return { ok: false, error: 'Envoyez le devis pour générer son PDF.' }
  }
  const url = await refreshQuotePdf(supabase, id)
  if (!url) return { ok: false, error: 'La génération du PDF a échoué.' }
  revalidatePath(`/devis/${id}`)
  return { ok: true, id }
}

/** sent | expired → draft : « repasser en brouillon » pour retravailler le devis. */
export async function revertQuoteToDraft(id: string): Promise<QuoteActionResult> {
  const supabase = await createSupabaseClient()
  const { data: quote } = await supabase.from('quotes').select('status').eq('id', id).maybeSingle()
  if (!quote) return { ok: false, error: 'Devis introuvable.' }
  if (!canTransition(quote.status, 'draft')) {
    return { ok: false, error: 'Transition non autorisée.' }
  }

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'draft', sent_at: null })
    .eq('id', id)
  if (error) return { ok: false, error: 'Échec de la mise à jour.' }

  revalidatePath('/devis')
  revalidatePath(`/devis/${id}`)
  return { ok: true, id }
}

/**
 * Bascule en `expired` tous les devis `sent` dont la validité est dépassée
 * (pour l'utilisateur courant). Logique réutilisée par le cron FAC-34.
 */
export async function expireOverdueQuotes(): Promise<
  { ok: true; expired: number } | { ok: false; error: string }
> {
  const supabase = await createSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .eq('status', 'sent')
    .lt('valid_until', today)
    .select('id')
  if (error) return { ok: false, error: 'Échec de la mise à jour.' }
  revalidatePath('/devis')
  return { ok: true, expired: data?.length ?? 0 }
}
