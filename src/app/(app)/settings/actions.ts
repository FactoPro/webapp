'use server'

import { revalidatePath } from 'next/cache'

import { createClient as createSupabaseClient } from '@/lib/server'
import {
  normalizeIban,
  parseAmount,
  parseReminderDays,
  type ProfileInput,
  profileSchema,
} from '@/lib/validations/profile'

export type ProfileActionResult = { ok: true } | { ok: false; error: string }

function nullifyEmpty(value: string): string | null {
  return value === '' ? null : value
}

export async function updateProfile(values: ProfileInput): Promise<ProfileActionResult> {
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: 'Formulaire invalide.' }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  const d = parsed.data
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: nullifyEmpty(d.first_name),
      last_name: nullifyEmpty(d.last_name),
      company_name: nullifyEmpty(d.company_name),
      siret: nullifyEmpty(d.siret),
      phone: nullifyEmpty(d.phone),
      address: nullifyEmpty(d.address),
      vat_number: nullifyEmpty(d.vat_number),
      iban: d.iban === '' ? null : normalizeIban(d.iban),
      bic: d.bic === '' ? null : d.bic.toUpperCase(),
      pdf_color: d.pdf_color,
      legal_mentions: nullifyEmpty(d.legal_mentions),
      logo_url: nullifyEmpty(d.logo_url),
      default_vat_rate: parseAmount(d.default_vat_rate),
      payment_terms: Number.parseInt(d.payment_terms, 10),
      micro_enterprise: d.micro_enterprise,
      urssaf_period: d.urssaf_period,
      urssaf_rate: parseAmount(d.urssaf_rate),
      versement_liberatoire: d.versement_liberatoire,
      income_tax_rate: parseAmount(d.income_tax_rate),
      reminder_days: parseReminderDays(d.reminder_days) ?? [],
      reminder_repeat_days: Number.parseInt(d.reminder_repeat_days, 10),
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: "L'enregistrement a échoué." }

  revalidatePath('/settings')
  return { ok: true }
}
