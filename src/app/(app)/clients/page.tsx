import { createClient } from '@/lib/server'

import { ClientsView } from './clients-view'

export const metadata = {
  title: 'Clients · FactoPro',
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  return <ClientsView clients={clients ?? []} />
}
