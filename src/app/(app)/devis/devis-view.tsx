'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'

import { columns, type QuoteListRow } from './columns'

export function DevisView({ quotes }: { quotes: QuoteListRow[] }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Devis</h1>
          <p className="text-sm text-muted-foreground">
            {quotes.length} devis{quotes.length > 1 ? '' : ''}
          </p>
        </div>
        <Button render={<Link href="/devis/nouveau" />}>Nouveau devis</Button>
      </div>

      <DataTable
        columns={columns}
        data={quotes}
        searchPlaceholder="Rechercher un devis…"
        emptyMessage="Aucun devis pour l'instant."
      />
    </div>
  )
}
