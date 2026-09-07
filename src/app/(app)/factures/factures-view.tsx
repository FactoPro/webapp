'use client'

import { DataTable } from '@/components/ui/data-table'

import { columns, type InvoiceListRow } from './columns'

export function FacturesView({ invoices }: { invoices: InvoiceListRow[] }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Factures</h1>
        <p className="text-sm text-muted-foreground">
          {invoices.length} facture{invoices.length > 1 ? 's' : ''}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Rechercher une facture…"
        emptyMessage="Aucune facture. Convertissez un devis accepté pour commencer."
      />
    </div>
  )
}
