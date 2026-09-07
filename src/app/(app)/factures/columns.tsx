'use client'

import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  effectiveInvoiceStatus,
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_VARIANTS,
  type InvoiceKind,
} from '@/lib/invoice-status'

import { InvoiceRowActions } from './invoice-row-actions'

export interface InvoiceListRow {
  id: string
  number: string | null
  title: string | null
  status: string
  kind: string
  total: number
  amountPaid: number
  due_date: string | null
  created_at: string
  clientName: string | null
}

export const columns: ColumnDef<InvoiceListRow>[] = [
  {
    accessorKey: 'number',
    header: 'Nº',
    cell: ({ row }) => (
      <Link
        href={`/factures/${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.number ?? 'Brouillon'}
      </Link>
    ),
  },
  {
    accessorKey: 'clientName',
    header: 'Client',
    cell: ({ row }) => row.original.clientName ?? '—',
  },
  {
    accessorKey: 'title',
    header: 'Objet',
    cell: ({ row }) => {
      const kindLabel =
        row.original.kind !== 'invoice'
          ? INVOICE_KIND_LABELS[row.original.kind as InvoiceKind]
          : null
      return (
        <span className="block max-w-64 truncate">
          {kindLabel && <span className="mr-1 text-muted-foreground">[{kindLabel}]</span>}
          {row.original.title ?? '—'}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const s = effectiveInvoiceStatus(row.original.status, row.original.due_date)
      return <Badge variant={INVOICE_STATUS_VARIANTS[s]}>{INVOICE_STATUS_LABELS[s]}</Badge>
    },
  },
  {
    accessorKey: 'due_date',
    header: 'Échéance',
    cell: ({ row }) => formatDate(row.original.due_date),
  },
  {
    accessorKey: 'total',
    header: () => <div className="text-right">Total TTC</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatCurrency(row.original.total)}</div>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <InvoiceRowActions
          id={row.original.id}
          label={row.original.number ?? 'ce brouillon'}
          canDelete={
            !row.original.number &&
            row.original.status !== 'paid' &&
            row.original.status !== 'partial'
          }
        />
      </div>
    ),
  },
]
