'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { Tables } from '@/types/database'

import { columns } from './columns'
import { DiscountDialog } from './discount-dialog'

type Discount = Tables<'discounts'>

export function RemisesView({ discounts }: { discounts: Discount[] }) {
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Remises</h1>
          <p className="text-sm text-muted-foreground">
            {discounts.length} remise{discounts.length > 1 ? 's' : ''} prédéfinie
            {discounts.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle remise</Button>
      </div>

      <DataTable
        columns={columns}
        data={discounts}
        searchPlaceholder="Rechercher une remise…"
        emptyMessage="Aucune remise prédéfinie."
      />

      <DiscountDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
