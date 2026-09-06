import { createClient } from '@/lib/server'

import type { QuoteListRow } from './columns'
import { DevisView } from './devis-view'

export const metadata = { title: 'Devis · FactoPro' }

export default async function DevisPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quotes')
    .select('id, number, title, status, total, valid_until, created_at, client:clients(name)')
    .order('created_at', { ascending: false })

  const quotes: QuoteListRow[] = (data ?? []).map((q) => ({
    id: q.id,
    number: q.number,
    title: q.title,
    status: q.status,
    total: q.total,
    valid_until: q.valid_until,
    created_at: q.created_at,
    clientName: (q.client as { name: string } | null)?.name ?? null,
  }))

  return <DevisView quotes={quotes} />
}
