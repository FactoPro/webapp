'use server'

import { revalidatePath } from 'next/cache'

import { createClient as createSupabaseClient } from '@/lib/server'
import { type DiscountInput, discountSchema, parseAmount } from '@/lib/validations/discount'

export type DiscountActionResult = { ok: true } | { ok: false; error: string }

export async function saveDiscount(
  values: DiscountInput,
  id?: string
): Promise<DiscountActionResult> {
  const parsed = discountSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const row = {
    user_id: user.id,
    label: parsed.data.label,
    kind: parsed.data.kind,
    value: parseAmount(parsed.data.value),
  }

  const { error } = id
    ? await supabase.from('discounts').update(row).eq('id', id)
    : await supabase.from('discounts').insert(row)

  if (error) return { ok: false, error: "L'enregistrement a échoué." }

  revalidatePath('/remises')
  return { ok: true }
}

export async function deleteDiscount(id: string): Promise<DiscountActionResult> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('discounts').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }

  revalidatePath('/remises')
  return { ok: true }
}
