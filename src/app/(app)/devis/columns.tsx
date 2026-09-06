'use client'

import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'

import { QuoteRowActions } from './quote-row-actions'

export interface QuoteListRow {
  id: string
  number: string | null
  title: string | null
  status: string
  total: number
  valid_until: string | null
  created_at: string
  clientName: string | null
}

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> =
  {
    draft: { label: 'Brouillon', variant: 'secondary' },
    sent: { label: 'Envoyé', variant: 'default' },
    accepted: { label: 'Accepté', variant: 'default' },
    refused: { label: 'Refusé', variant: 'destructive' },
    expired: { label: 'Expiré', variant: 'secondary' },
  }

export const columns: ColumnDef<QuoteListRow>[] = [
  {
    accessorKey: 'number',
    header: 'Nº',
    cell: ({ row }) => (
      <Link
        href={`/devis/${row.original.id}`}
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
    cell: ({ row }) => <span className="block max-w-64 truncate">{row.original.title ?? '—'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const s = STATUS[row.original.status] ?? {
        label: row.original.status,
        variant: 'secondary' as const,
      }
      return <Badge variant={s.variant}>{s.label}</Badge>
    },
  },
  {
    accessorKey: 'valid_until',
    header: 'Validité',
    cell: ({ row }) => formatDate(row.original.valid_until),
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
        <QuoteRowActions id={row.original.id} label={row.original.number ?? 'ce brouillon'} />
      </div>
    ),
  },
]
