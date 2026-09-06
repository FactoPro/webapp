'use client'

import { type ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { CATALOG_UNIT_LABELS, type CatalogUnit } from '@/lib/validations/catalog-item'
import type { Tables } from '@/types/database'

import { CatalogItemRowActions } from './catalog-item-row-actions'

type CatalogItem = Tables<'catalog_items'>

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export const columns: ColumnDef<CatalogItem>[] = [
  {
    accessorKey: 'label',
    header: 'Libellé',
    cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
  },
  {
    accessorKey: 'category',
    header: 'Catégorie',
    cell: ({ row }) =>
      row.original.category ? <Badge variant="secondary">{row.original.category}</Badge> : '—',
  },
  {
    accessorKey: 'unit_price',
    header: () => <div className="text-right">Prix HT</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {currency.format(Number(row.original.unit_price))}
      </div>
    ),
  },
  {
    accessorKey: 'unit',
    header: 'Unité',
    cell: ({ row }) => CATALOG_UNIT_LABELS[row.original.unit as CatalogUnit] ?? row.original.unit,
  },
  {
    accessorKey: 'vat_rate',
    header: () => <div className="text-right">TVA</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {Number(row.original.vat_rate).toLocaleString('fr-FR')} %
      </div>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <CatalogItemRowActions item={row.original} />
      </div>
    ),
  },
]
