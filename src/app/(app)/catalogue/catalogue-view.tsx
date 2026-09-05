'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { Tables } from '@/types/database'

import { CatalogItemDialog } from './catalog-item-dialog'
import { columns } from './columns'

type CatalogItem = Tables<'catalog_items'>

export function CatalogueView({ items }: { items: CatalogItem[] }) {
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} prestation{items.length > 1 ? 's' : ''} réutilisable
            {items.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle prestation</Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="Rechercher une prestation…"
        emptyMessage="Aucune prestation dans le catalogue."
      />

      <CatalogItemDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
