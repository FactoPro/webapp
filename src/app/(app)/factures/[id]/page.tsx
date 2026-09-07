import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type CalcLineItem, vatBreakdown } from '@/lib/calculations'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  effectiveInvoiceStatus,
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_VARIANTS,
  type InvoiceKind,
} from '@/lib/invoice-status'
import { createClient } from '@/lib/server'

import { InvoiceRowActions } from '../invoice-row-actions'

interface InvoiceLine {
  label: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('invoices').select('number').eq('id', id).maybeSingle()
  return { title: `${data?.number ?? 'Facture'} · FactoPro` }
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(name, company_name, address), quote:quotes(number)')
    .eq('id', id)
    .maybeSingle()
  if (!invoice) notFound()

  const lines = (
    Array.isArray(invoice.items) ? (invoice.items as unknown as InvoiceLine[]) : []
  ).map((l) => ({
    ...l,
    quantity: Number(l.quantity) || 0,
    unit_price: Number(l.unit_price) || 0,
    vat_rate: Number(l.vat_rate) || 0,
  }))
  const calcLines: CalcLineItem[] = lines.map((l) => ({
    quantity: l.quantity,
    unit_price: l.unit_price,
    vat_rate: l.vat_rate,
  }))
  const breakdown = vatBreakdown(calcLines, 'fixed', invoice.discount_amount)

  const status = effectiveInvoiceStatus(invoice.status, invoice.due_date)
  const client = invoice.client as {
    name: string
    company_name: string | null
    address: string | null
  } | null
  const sourceQuote = invoice.quote as { number: string | null } | null
  const kindLabel =
    invoice.kind !== 'invoice' ? INVOICE_KIND_LABELS[invoice.kind as InvoiceKind] : 'Facture'
  const remaining = Number(invoice.total) - Number(invoice.amount_paid)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-xl font-semibold">
            {kindLabel} {invoice.number ?? '(brouillon)'}
          </h1>
          <Badge variant={INVOICE_STATUS_VARIANTS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/factures" />}
          >
            Toutes les factures
          </Button>
          <InvoiceRowActions
            id={invoice.id}
            label={invoice.number ?? 'ce brouillon'}
            canDelete={invoice.status !== 'paid' && invoice.status !== 'partial'}
            redirectOnDelete
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Client</p>
          <p className="font-medium">{client?.name ?? '—'}</p>
          {client?.company_name && <p className="text-muted-foreground">{client.company_name}</p>}
          {client?.address && (
            <p className="whitespace-pre-line text-muted-foreground">{client.address}</p>
          )}
        </div>
        <div className="sm:text-right">
          {invoice.title && <p className="font-medium">{invoice.title}</p>}
          <p className="text-muted-foreground">Émise le {formatDate(invoice.created_at)}</p>
          <p className="text-muted-foreground">Échéance {formatDate(invoice.due_date)}</p>
          {sourceQuote?.number && (
            <p className="text-muted-foreground">Issue du devis {sourceQuote.number}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
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
            <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Remise{invoice.discount_label ? ` — ${invoice.discount_label}` : ''}
              </span>
              <span className="tabular-nums">− {formatCurrency(invoice.discount_amount)}</span>
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
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total TTC</span>
            <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
          </div>
          {Number(invoice.amount_paid) > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Déjà réglé</span>
                <span className="tabular-nums">− {formatCurrency(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Restant dû</span>
                <span className="tabular-nums">{formatCurrency(remaining)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {invoice.notes && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.notes}</p>
      )}
    </div>
  )
}
