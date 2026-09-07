import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '@/types/database'

import { InvoiceDocument, type InvoicePdfData, type InvoicePdfLine } from './invoice-document'

type Invoice = Tables<'invoices'>
type Profile = Tables<'profiles'>
type Client = Pick<Tables<'clients'>, 'name' | 'company_name' | 'siret' | 'address' | 'email'>

function toLines(items: unknown): InvoicePdfLine[] {
  if (!Array.isArray(items)) return []
  return items.map((raw) => {
    const item = raw as Record<string, unknown>
    return {
      label: String(item.label ?? ''),
      quantity: Number(item.quantity) || 0,
      unit: String(item.unit ?? 'u'),
      unit_price: Number(item.unit_price) || 0,
      vat_rate: Number(item.vat_rate) || 0,
    }
  })
}

export function invoicePdfData(
  invoice: Invoice,
  issuer: Profile,
  client: Client | null
): InvoicePdfData {
  return {
    number: invoice.number,
    kind: invoice.kind,
    title: invoice.title,
    notes: invoice.notes,
    status: invoice.status,
    created_at: invoice.created_at,
    due_date: invoice.due_date,
    paid_at: invoice.paid_at,
    payment_method: invoice.payment_method,
    items: toLines(invoice.items),
    subtotal: Number(invoice.subtotal),
    discount_amount: Number(invoice.discount_amount),
    discount_label: invoice.discount_label,
    vat_amount: Number(invoice.vat_amount),
    total: Number(invoice.total),
    amount_paid: Number(invoice.amount_paid),
    deposit_deducted: Number(invoice.deposit_deducted ?? 0),
    deposit_reference: invoice.deposit_reference,
    client: client
      ? {
          name: client.name,
          company_name: client.company_name,
          siret: client.siret,
          address: client.address,
          email: client.email,
        }
      : null,
    issuer: {
      name:
        issuer.company_name ||
        [issuer.first_name, issuer.last_name].filter(Boolean).join(' ') ||
        null,
      address: issuer.address,
      siret: issuer.siret,
      vat_number: issuer.vat_number,
      iban: issuer.iban,
      bic: issuer.bic,
      logo_url: issuer.logo_url,
      legal_mentions: issuer.legal_mentions,
      pdf_color: issuer.pdf_color,
      payment_terms: issuer.payment_terms,
    },
  }
}

/**
 * Génère le PDF de la facture et le stocke dans le bucket `documents`.
 * Renvoie l'URL publique, ou `null` en cas d'échec (jamais throw : best-effort).
 * Le client Supabase doit être authentifié en tant qu'artisan propriétaire.
 */
export async function renderAndStoreInvoicePdf(
  supabase: SupabaseClient<Database>,
  invoice: Invoice,
  issuer: Profile,
  client: Client | null
): Promise<string | null> {
  try {
    const buffer = await renderToBuffer(
      InvoiceDocument({ data: invoicePdfData(invoice, issuer, client) })
    )
    const path = `${invoice.user_id}/invoices/${invoice.id}.pdf`

    const { error } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (error) {
      console.error('[invoice-pdf] upload', error.message)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(path)
    // `?v=` : le chemin est stable (upsert), on force le rafraîchissement du
    // cache CDN/navigateur à chaque régénération.
    return `${publicUrl}?v=${Date.now()}`
  } catch (error) {
    console.error('[invoice-pdf] render', error)
    return null
  }
}
