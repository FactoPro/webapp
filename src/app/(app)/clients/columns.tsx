'use client'

import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { CLIENT_TYPE_LABELS } from '@/lib/validations/client'
import type { Tables } from '@/types/database'

import { ClientRowActions } from './client-row-actions'

type Client = Tables<'clients'>

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => (
      <Link
        href={`/clients/${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={row.original.type === 'company' ? 'default' : 'secondary'}>
        {CLIENT_TYPE_LABELS[row.original.type as keyof typeof CLIENT_TYPE_LABELS] ??
          row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: 'company_name',
    header: 'Raison sociale',
    cell: ({ row }) => row.original.company_name ?? '—',
  },
  {
    accessorKey: 'email',
    header: 'E-mail',
    cell: ({ row }) => row.original.email ?? '—',
  },
  {
    accessorKey: 'phone',
    header: 'Téléphone',
    cell: ({ row }) => row.original.phone ?? '—',
  },
  {
    id: 'actions',
    header: '',
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ClientRowActions client={row.original} />
      </div>
    ),
  },
]
