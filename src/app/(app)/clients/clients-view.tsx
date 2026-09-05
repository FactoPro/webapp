'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { Tables } from '@/types/database'

import { ClientDialog } from './client-dialog'
import { columns } from './columns'

type Client = Tables<'clients'>
type TypeFilter = 'all' | 'individual' | 'company'

const FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'individual', label: 'Particuliers' },
  { value: 'company', label: 'Entreprises' },
]

export function ClientsView({ clients }: { clients: Client[] }) {
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all')
  const [createOpen, setCreateOpen] = React.useState(false)

  const filtered = React.useMemo(
    () => (typeFilter === 'all' ? clients : clients.filter((client) => client.type === typeFilter)),
    [clients, typeFilter]
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nouveau client</Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Rechercher un client…"
        emptyMessage="Aucun client pour l'instant."
        toolbar={
          <div className="flex gap-1">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={typeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        }
      />

      <ClientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
