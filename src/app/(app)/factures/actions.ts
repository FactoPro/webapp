'use server'

import { revalidatePath } from 'next/cache'

import { sendInvoiceToClient } from '@/lib/email/invoice-email'
import { renderAndStoreInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { createClient as createSupabaseClient } from '@/lib/server'
import { parseAmount } from '@/lib/validations/number'

export type InvoiceActionResult = { ok: true; id: string } | { ok: false; error: string }

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function frDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
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

  const [{ data: profile }, { data: deposits }] = await Promise.all([
    supabase.from('profiles').select('payment_terms').eq('id', user.id).maybeSingle(),
    supabase
      .from('invoices')
      .select('total, number, created_at')
      .eq('quote_id', quoteId)
      .eq('kind', 'deposit')
      .eq('status', 'paid'),
  ])

  // Acomptes déjà encaissés sur ce devis → déduits de la facture finale (FAC-29).
  const depositTotal = round2((deposits ?? []).reduce((sum, d) => sum + Number(d.total), 0))
  const depositReference =
    (deposits ?? []).map((d) => `${d.number ?? 'acompte'} du ${frDate(d.created_at)}`).join(', ') ||
    null

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
      amount_paid: depositTotal,
      deposit_deducted: depositTotal > 0 ? depositTotal : null,
      deposit_reference: depositReference,
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
    .select('id, status, number, kind, client_id, user_id, total, amount_paid')
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

  // Un acompte déjà déduit (FAC-29) peut solder la facture dès la finalisation.
  const paid = Number(invoice.amount_paid)
  const status = paid >= Number(invoice.total) ? 'paid' : paid > 0 ? 'partial' : 'sent'

  const { error } = await supabase
    .from('invoices')
    .update({
      status,
      number,
      sent_at: new Date().toISOString(),
      ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
    })
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

/** Statut recalculé d'après le montant réglé. */
function statusFromPaid(paid: number, total: number): 'sent' | 'partial' | 'paid' {
  if (paid >= total) return 'paid'
  return paid > 0 ? 'partial' : 'sent'
}

interface RecordPaymentInput {
  amount?: string
  payment_method?: string
  notes?: string
}

/**
 * Enregistre un paiement (acompte ou solde) sur une facture (FAC-29).
 * Met à jour `amount_paid` et bascule le statut en `partial` / `paid`.
 * Montant absent → solde restant dû.
 */
export async function recordPayment(
  invoiceId: string,
  input: RecordPaymentInput
): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, total, amount_paid')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }
  if (invoice.status === 'draft') {
    return { ok: false, error: 'Finalisez la facture avant d’enregistrer un paiement.' }
  }
  if (invoice.status === 'paid') return { ok: false, error: 'Cette facture est déjà soldée.' }
  if (invoice.status === 'cancelled') return { ok: false, error: 'Facture annulée.' }

  const remaining = round2(Number(invoice.total) - Number(invoice.amount_paid))
  const raw = input.amount?.trim()
  const amount = raw ? round2(parseAmount(raw)) : remaining
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Montant invalide.' }
  }
  if (amount > remaining + 0.001) {
    return { ok: false, error: `Le montant dépasse le restant dû (${remaining.toFixed(2)} €).` }
  }

  const method = input.payment_method?.trim() || null
  const { error: payErr } = await supabase.from('payments').insert({
    invoice_id: invoiceId,
    amount,
    payment_method: method,
    notes: input.notes?.trim() || null,
  })
  if (payErr) return { ok: false, error: "L'enregistrement du paiement a échoué." }

  const newPaid = round2(Number(invoice.amount_paid) + amount)
  const status = statusFromPaid(newPaid, Number(invoice.total))
  const { error } = await supabase
    .from('invoices')
    .update({
      amount_paid: newPaid,
      status,
      ...(method ? { payment_method: method } : {}),
      ...(status === 'paid' ? { paid_at: new Date().toISOString() } : { paid_at: null }),
    })
    .eq('id', invoiceId)
  if (error) return { ok: false, error: 'La mise à jour de la facture a échoué.' }

  await refreshInvoicePdf(supabase, invoiceId)
  revalidatePath('/factures')
  revalidatePath(`/factures/${invoiceId}`)
  return { ok: true, id: invoiceId }
}

/** Annule un paiement enregistré par erreur : retire le montant et recalcule le statut. */
export async function deletePayment(paymentId: string): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, invoice_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { ok: false, error: 'Paiement introuvable.' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, deposit_deducted')
    .eq('id', payment.invoice_id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Facture introuvable.' }

  const { error: delErr } = await supabase.from('payments').delete().eq('id', paymentId)
  if (delErr) return { ok: false, error: "L'annulation a échoué." }

  const newPaid = round2(Number(invoice.amount_paid) - Number(payment.amount))
  const status = statusFromPaid(newPaid, Number(invoice.total))
  await supabase
    .from('invoices')
    .update({ amount_paid: Math.max(0, newPaid), status, paid_at: null })
    .eq('id', invoice.id)

  await refreshInvoicePdf(supabase, invoice.id)
  revalidatePath('/factures')
  revalidatePath(`/factures/${invoice.id}`)
  return { ok: true, id: invoice.id }
}

/**
 * Crée une facture d'acompte (% du devis) rattachée au devis (FAC-29).
 * Une seule ligne « Acompte de N% », TVA moyenne pondérée. Créée en `draft`
 * (numérotée à la finalisation, comme toute facture).
 */
export async function createDepositInvoice(
  quoteId: string,
  percentRaw: string
): Promise<InvoiceActionResult> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const percent = round2(parseAmount(percentRaw))
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return { ok: false, error: "Pourcentage d'acompte invalide (1 à 100)." }
  }

  const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle()
  if (!quote) return { ok: false, error: 'Devis introuvable.' }
  if (quote.status !== 'sent' && quote.status !== 'accepted') {
    return { ok: false, error: 'Le devis doit être envoyé ou accepté.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('payment_terms')
    .eq('id', user.id)
    .maybeSingle()

  const ratio = percent / 100
  const subtotal = round2(Number(quote.subtotal) * ratio)
  const vat = round2(Number(quote.vat_amount) * ratio)
  const total = round2(Number(quote.total) * ratio)
  const blendedVat = subtotal > 0 ? Math.round((vat / subtotal) * 1000) / 10 : 0

  const { data: inserted, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      client_id: quote.client_id,
      quote_id: quote.id,
      project_id: quote.project_id,
      kind: 'deposit',
      status: 'draft',
      title: `Acompte ${percent}% — ${quote.title ?? quote.number ?? 'devis'}`,
      items: [
        {
          label: `Acompte de ${percent}% sur le devis ${quote.number ?? ''}`.trim(),
          quantity: 1,
          unit: 'forfait',
          unit_price: subtotal,
          vat_rate: blendedVat,
        },
      ],
      subtotal,
      vat_amount: vat,
      total,
      due_date: addDays(profile?.payment_terms ?? 30),
      notes: `Acompte à déduire de la facture finale du devis ${quote.number ?? ''}.`.trim(),
    })
    .select('id')
    .single()
  if (error || !inserted) return { ok: false, error: "La création de l'acompte a échoué." }

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
