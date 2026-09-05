import { createClient } from '@/lib/server'

import { RemisesView } from './remises-view'

export const metadata = {
  title: 'Remises · FactoPro',
}

export default async function RemisesPage() {
  const supabase = await createClient()
  const { data: discounts } = await supabase
    .from('discounts')
    .select('*')
    .order('label', { ascending: true })

  return <RemisesView discounts={discounts ?? []} />
}
