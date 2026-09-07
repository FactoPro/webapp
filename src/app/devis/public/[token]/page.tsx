import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { type CalcLineItem, vatBreakdown } from '@/lib/calculations'
import { formatCurrency, formatDate } from '@/lib/format'
import { effectiveStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_VARIANTS } from '@/lib/quote-status'
import { createClient } from '@/lib/server'

import { AcceptRefuseForm } from './accept-refuse-form'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface QuoteLine {
  label: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
}

export const metadata = { title: 'Devis', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!UUID_RE.test(token)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token })
  const quote = data?.[0]
  if (error || !quote) notFound()

  const lines = (Array.isArray(quote.items) ? (quote.items as unknown as QuoteLine[]) : []).map(
    (l) => ({
      ...l,
      quantity: Number(l.quantity) || 0,
      unit_price: Number(l.unit_price) || 0,
      vat_rate: Number(l.vat_rate) || 0,
    })
  )
  const calcLines: CalcLineItem[] = lines.map((l) => ({
    quantity: l.quantity,
    unit_price: l.unit_price,
    vat_rate: l.vat_rate,
  }))
  const breakdown = vatBreakdown(calcLines, 'fixed', quote.discount_amount)

  const status = effectiveStatus(quote.status, quote.valid_until)
  const color = /^#[0-9a-fA-F]{6}$/.test(quote.issuer_pdf_color ?? '')
    ? quote.issuer_pdf_color
    : '#13283C'
  const pending = status === 'sent'

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {quote.issuer_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo distant
            <img src={quote.issuer_logo_url} alt="" className="h-12 w-auto object-contain" />
          ) : null}
          <div>
            <p className="font-heading text-lg font-semibold" style={{ color }}>
              {quote.issuer_name || 'Devis'}
            </p>
            {quote.issuer_address && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {quote.issuer_address}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {[
                quote.issuer_siret && `SIRET ${quote.issuer_siret}`,
                quote.issuer_vat_number && `TVA ${quote.issuer_vat_number}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color }}>
            DEVIS {quote.number ?? ''}
          </p>
          <Badge variant={QUOTE_STATUS_VARIANTS[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
          {quote.valid_until && (
            <p className="mt-1 text-sm text-muted-foreground">
              Valable jusqu&apos;au {formatDate(quote.valid_until)}
            </p>
          )}
        </div>
      </div>

      {quote.title && <h1 className="font-heading text-xl font-semibold">{quote.title}</h1>}
      {quote.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{quote.description}</p>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ color }}>
              <th className="p-2 font-medium">Prestation</th>
              <th className="p-2 text-right font-medium">Qté</th>
              <th className="p-2 text-right font-medium">P.U. HT</th>
              <th className="p-2 text-right font-medium">TVA</th>
              <th className="p-2 text-right font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-2">{l.label}</td>
                <td className="p-2 text-right tabular-nums">
                  {l.quantity} {l.unit}
                </td>
                <td className="p-2 text-right tabular-nums">{formatCurrency(l.unit_price)}</td>
                <td className="p-2 text-right tabular-nums">{l.vat_rate} %</td>
                <td className="p-2 text-right tabular-nums">
                  {formatCurrency(l.quantity * l.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
          </div>
          {quote.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Remise{quote.discount_label ? ` — ${quote.discount_label}` : ''}
              </span>
              <span className="tabular-nums">− {formatCurrency(quote.discount_amount)}</span>
            </div>
          )}
          {breakdown.map((b) => (
            <div key={b.rate} className="flex justify-between text-muted-foreground">
              <span>
                TVA {b.rate} % (sur {formatCurrency(b.base)})
              </span>
              <span className="tabular-nums">{formatCurrency(b.vat)}</span>
            </div>
          ))}
          <div
            className="flex justify-between border-t pt-1 text-base font-semibold"
            style={{ color }}
          >
            <span>Total TTC</span>
            <span className="tabular-nums">{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{quote.notes}</p>
      )}
      {quote.issuer_legal_mentions && (
        <p className="whitespace-pre-line text-xs text-muted-foreground">
          {quote.issuer_legal_mentions}
        </p>
      )}
      {(quote.issuer_iban || quote.issuer_bic) && (
        <p className="text-xs text-muted-foreground">
          {quote.issuer_iban && `IBAN ${quote.issuer_iban}`}
          {quote.issuer_iban && quote.issuer_bic && ' · '}
          {quote.issuer_bic && `BIC ${quote.issuer_bic}`}
        </p>
      )}

      <div className="mt-2">
        {pending ? (
          <AcceptRefuseForm token={token} />
        ) : (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            {status === 'accepted' && 'Ce devis a été accepté. Merci !'}
            {status === 'refused' && 'Ce devis a été refusé.'}
            {status === 'expired' &&
              'Ce devis a expiré. Contactez l’artisan pour obtenir une nouvelle proposition.'}
            {status === 'draft' && 'Ce devis n’est pas encore disponible.'}
          </div>
        )}
      </div>
    </div>
  )
}
