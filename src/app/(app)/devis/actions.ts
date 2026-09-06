'use server'

import { revalidatePath } from 'next/cache'

import { computeTotals } from '@/lib/calculations'
import { createClient as createSupabaseClient } from '@/lib/server'
import { parseAmount, type QuoteInput, quoteSchema, resolveDiscount } from '@/lib/validations/quote'

export type QuoteActionResult = { ok: true; id: string } | { ok: false; error: string }

export async function saveQuote(values: QuoteInput, id?: string): Promise<QuoteActionResult> {
  const parsed = quoteSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const data = parsed.data

  const { data: presets } = await supabase.from('discounts').select('id, kind, value, label')
  const discount = resolveDiscount(data, presets ?? [])

  const items = data.items.map((item) => ({
    label: item.label,
    quantity: parseAmount(item.quantity),
    unit: item.unit,
    unit_price: parseAmount(item.unit_price),
    vat_rate: parseAmount(item.vat_rate),
    catalog_item_id: item.catalog_item_id ?? null,
  }))

  const totals = computeTotals(items, discount.kind, discount.value)

  const row = {
    user_id: user.id,
    client_id: data.client_id,
    title: data.title || null,
    description: data.description || null,
    valid_until: data.valid_until || null,
    notes: data.notes || null,
    items,
    discount_kind: discount.kind,
    discount_value: discount.value,
    discount_label: discount.label,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    vat_amount: totals.vatAmount,
    total: totals.total,
  }

  if (id) {
    const { error } = await supabase.from('quotes').update(row).eq('id', id)
    if (error) return { ok: false, error: "L'enregistrement a échoué." }
    revalidatePath('/devis')
    revalidatePath(`/devis/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await supabase
    .from('quotes')
    .insert({ ...row, status: 'draft' })
    .select('id')
    .single()
  if (error || !inserted) return { ok: false, error: 'La création a échoué.' }

  revalidatePath('/devis')
  return { ok: true, id: inserted.id }
}

export async function deleteQuote(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) return { ok: false, error: 'La suppression a échoué.' }
  revalidatePath('/devis')
  return { ok: true }
}
