'use client'

import { type ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { DISCOUNT_KIND_LABELS, type DiscountKind } from '@/lib/validations/discount'
import type { Tables } from '@/types/database'

import { DiscountRowActions } from './discount-row-actions'

type Discount = Tables<'discounts'>

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function formatValue(discount: Discount): string {
  return discount.kind === 'percent'
    ? `${Number(discount.value).toLocaleString('fr-FR')} %`
    : currency.format(Number(discount.value))
}

export const columns: ColumnDef<Discount>[] = [
  {
    accessorKey: 'label',
    header: 'Libellé',
    cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
  },
  {
    accessorKey: 'kind',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="secondary">
        {DISCOUNT_KIND_LABELS[row.original.kind as DiscountKind] ?? row.original.kind}
      </Badge>
    ),
  },
  {
    accessorKey: 'value',
    header: () => <div className="text-right">Valeur</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{formatValue(row.original)}</div>,
  },
  {
    id: 'actions',
    header: '',
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DiscountRowActions discount={row.original} />
      </div>
    ),
  },
]
