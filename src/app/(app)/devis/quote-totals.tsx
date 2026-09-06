'use client'

import * as React from 'react'

import {
  type CalcLineItem,
  computeTotals,
  type DiscountKind,
  vatBreakdown,
} from '@/lib/calculations'
import { formatCurrency } from '@/lib/format'

interface QuoteTotalsProps {
  items: CalcLineItem[]
  discountKind: DiscountKind | null
  discountValue: number | string | null
  discountLabel?: string
}

export function QuoteTotals({
  items,
  discountKind,
  discountValue,
  discountLabel,
}: QuoteTotalsProps) {
  const totals = React.useMemo(
    () => computeTotals(items, discountKind, discountValue),
    [items, discountKind, discountValue]
  )
  const breakdown = React.useMemo(
    () => vatBreakdown(items, discountKind, discountValue),
    [items, discountKind, discountValue]
  )

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 text-sm">
      <Row label="Sous-total HT" value={formatCurrency(totals.subtotal)} />
      {totals.discountAmount > 0 && (
        <Row
          label={`Remise${discountLabel ? ` — ${discountLabel}` : ''}`}
          value={`− ${formatCurrency(totals.discountAmount)}`}
        />
      )}
      {breakdown.map((row) => (
        <Row
          key={row.rate}
          label={`TVA ${row.rate} % (sur ${formatCurrency(row.base)})`}
          value={formatCurrency(row.vat)}
          muted
        />
      ))}
      <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-semibold">
        <span>Total TTC</span>
        <span className="tabular-nums">{formatCurrency(totals.total)}</span>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
