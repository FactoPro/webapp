import { redirect } from 'next/navigation'

import { createClient } from '@/lib/server'

import { SettingsForm } from './settings-form'

export const metadata = {
  title: 'Paramètres · FactoPro',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  // Une seule ligne par utilisateur, restreinte par la policy RLS
  // `profiles_select_own` (id = auth.uid()). On évite un `getUser()`
  // redondant ici : le layout `(app)` garde déjà la session.
  const { data: profile } = await supabase.from('profiles').select('*').single()
  if (!profile) redirect('/login')

  return <SettingsForm profile={profile} userId={profile.id} />
}
