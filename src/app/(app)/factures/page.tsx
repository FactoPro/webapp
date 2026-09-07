import { createClient } from '@/lib/server'

import type { InvoiceListRow } from './columns'
import { FacturesView } from './factures-view'

export const metadata = { title: 'Factures · FactoPro' }

export default async function FacturesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select(
      'id, number, title, status, kind, total, amount_paid, due_date, created_at, client:clients(name)'
    )
    .order('created_at', { ascending: false })

  const invoices: InvoiceListRow[] = (data ?? []).map((i) => ({
    id: i.id,
    number: i.number,
    title: i.title,
    status: i.status,
    kind: i.kind,
    total: i.total,
    amountPaid: i.amount_paid,
    due_date: i.due_date,
    created_at: i.created_at,
    clientName: (i.client as { name: string } | null)?.name ?? null,
  }))

  return <FacturesView invoices={invoices} />
}
