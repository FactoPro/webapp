import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '@/types/database'

import { QuoteDocument, type QuotePdfData, type QuotePdfLine } from './quote-document'

type Quote = Tables<'quotes'>
type Profile = Tables<'profiles'>

function toLines(items: unknown): QuotePdfLine[] {
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

export function quotePdfData(quote: Quote, issuer: Profile): QuotePdfData {
  return {
    number: quote.number,
    title: quote.title,
    description: quote.description,
    valid_until: quote.valid_until,
    notes: quote.notes,
    items: toLines(quote.items),
    subtotal: Number(quote.subtotal),
    discount_amount: Number(quote.discount_amount),
    discount_label: quote.discount_label,
    vat_amount: Number(quote.vat_amount),
    total: Number(quote.total),
    signature_name: quote.signature_name,
    accepted_at: quote.accepted_at,
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
    },
  }
}

/**
 * Génère le PDF du devis et le stocke dans le bucket `documents`.
 * Renvoie l'URL publique, ou `null` en cas d'échec (jamais throw : best-effort).
 * Le client Supabase doit être authentifié en tant qu'artisan propriétaire.
 */
export async function renderAndStoreQuotePdf(
  supabase: SupabaseClient<Database>,
  quote: Quote,
  issuer: Profile
): Promise<string | null> {
  try {
    const buffer = await renderToBuffer(QuoteDocument({ data: quotePdfData(quote, issuer) }))
    const suffix = quote.public_token.slice(0, 8)
    const path = `${quote.user_id}/quotes/${quote.id}-${suffix}.pdf`

    const { error } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (error) {
      console.error('[quote-pdf] upload', error.message)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(path)
    return publicUrl
  } catch (error) {
    console.error('[quote-pdf] render', error)
    return null
  }
}
