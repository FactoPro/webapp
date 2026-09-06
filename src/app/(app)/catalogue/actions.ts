'use server'

import { revalidatePath } from 'next/cache'

import { createClient as createSupabaseClient } from '@/lib/server'
import {
  type CatalogItemInput,
  catalogItemSchema,
  parseAmount,
} from '@/lib/validations/catalog-item'

export type CatalogActionResult = { ok: true } | { ok: false; error: string }

export async function saveCatalogItem(
  values: CatalogItemInput,
  id?: string
): Promise<CatalogActionResult> {
  const parsed = catalogItemSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const row = {
    user_id: user.id,
    label: parsed.data.label,
    unit: parsed.data.unit,
    unit_price: parseAmount(parsed.data.unit_price),
    vat_rate: parseAmount(parsed.data.vat_rate),
    category: parsed.data.category === '' ? null : parsed.data.category,
  }

  const { error } = id
    ? await supabase.from('catalog_items').update(row).eq('id', id)
    : await supabase.from('catalog_items').insert(row)

  if (error) return { ok: false, error: "L'enregistrement a échoué." }

  revalidatePath('/catalogue')
  return { ok: true }
}

export async function deleteCatalogItem(id: string): Promise<CatalogActionResult> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('catalog_items').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }

  revalidatePath('/catalogue')
  return { ok: true }
}
