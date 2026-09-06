'use server'

import { revalidatePath } from 'next/cache'

import { createClient as createSupabaseClient } from '@/lib/server'
import { type ClientInput, clientSchema } from '@/lib/validations/client'

export type ClientActionResult = { ok: true } | { ok: false; error: string }

function nullifyEmpty(value: string): string | null {
  return value === '' ? null : value
}

export async function saveClient(values: ClientInput, id?: string): Promise<ClientActionResult> {
  const parsed = clientSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const row = {
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    company_name: nullifyEmpty(parsed.data.company_name),
    email: nullifyEmpty(parsed.data.email),
    phone: nullifyEmpty(parsed.data.phone),
    address: nullifyEmpty(parsed.data.address),
    siret: nullifyEmpty(parsed.data.siret),
  }

  const { error } = id
    ? await supabase.from('clients').update(row).eq('id', id)
    : await supabase.from('clients').insert(row)

  if (error) return { ok: false, error: "L'enregistrement a échoué." }

  revalidatePath('/clients')
  return { ok: true }
}

export async function deleteClient(id: string): Promise<ClientActionResult> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }

  revalidatePath('/clients')
  return { ok: true }
}

export type ImportClientsResult = { ok: true; inserted: number } | { ok: false; error: string }

export async function importClients(rows: ClientInput[]): Promise<ImportClientsResult> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  // Re-validation côté serveur : on n'insère que les lignes valides.
  const payload = rows
    .map((row) => clientSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => ({
      user_id: user.id,
      name: result.data.name,
      type: result.data.type,
      company_name: nullifyEmpty(result.data.company_name),
      email: nullifyEmpty(result.data.email),
      phone: nullifyEmpty(result.data.phone),
      address: nullifyEmpty(result.data.address),
      siret: nullifyEmpty(result.data.siret),
    }))

  if (payload.length === 0) return { ok: false, error: 'Aucune ligne valide à importer.' }

  const { error } = await supabase.from('clients').insert(payload)
  if (error) return { ok: false, error: "L'import a échoué." }

  revalidatePath('/clients')
  return { ok: true, inserted: payload.length }
}
