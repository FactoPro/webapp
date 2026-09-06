import { notFound } from 'next/navigation'

import { createClient } from '@/lib/server'

import { loadEditorData } from '../editor-data'
import { QuoteEditor } from '../quote-editor'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('quotes').select('number').eq('id', id).maybeSingle()
  return { title: `${data?.number ?? 'Devis'} · FactoPro` }
}

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle()
  if (!quote) notFound()

  const { clients, catalogItems, discounts } = await loadEditorData()

  return (
    <QuoteEditor
      quote={quote}
      clients={clients}
      catalogItems={catalogItems}
      discounts={discounts}
    />
  )
}
