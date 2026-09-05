import { createClient } from '@/lib/server'

import { CatalogueView } from './catalogue-view'

export const metadata = {
  title: 'Catalogue · FactoPro',
}

export default async function CataloguePage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('catalog_items')
    .select('*')
    .order('label', { ascending: true })

  return <CatalogueView items={items ?? []} />
}
