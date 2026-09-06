import { z } from 'zod'

import { numericString, parseAmount } from './number'

export { parseAmount }

const optionalText = (max: number) => z.string().trim().max(max)

const stripSpaces = (value: string) => value.replace(/\s+/g, '')

export const profileSchema = z.object({
  first_name: optionalText(100),
  last_name: optionalText(100),
  company_name: optionalText(200),
  siret: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{14}$/.test(v), 'Le SIRET doit comporter 14 chiffres'),
  phone: optionalText(30),
  address: optionalText(500),
  vat_number: optionalText(20),
  iban: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/i.test(stripSpaces(v)),
      'IBAN invalide'
    ),
  bic: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(v), 'BIC invalide'),
  pdf_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale invalide (ex. #13283C)'),
  legal_mentions: optionalText(2000),
  logo_url: optionalText(500),
  default_vat_rate: numericString('Taux de TVA').refine(
    (v) => parseAmount(v) <= 100,
    'Taux de TVA invalide'
  ),
  payment_terms: z
    .string()
    .trim()
    .min(1, 'Délai de paiement requis')
    .refine((v) => /^\d+$/.test(v) && Number(v) <= 365, 'Délai en jours invalide'),

  // Régime micro-entreprise / URSSAF (FAC-14)
  micro_enterprise: z.boolean(),
  urssaf_period: z.enum(['monthly', 'quarterly']),
  urssaf_rate: numericString('Taux URSSAF').refine(
    (v) => parseAmount(v) <= 100,
    'Taux URSSAF invalide'
  ),
  versement_liberatoire: z.boolean(),
  income_tax_rate: numericString("Taux d'impôt").refine(
    (v) => parseAmount(v) <= 100,
    "Taux d'impôt invalide"
  ),

  // Relances (FAC-15)
  reminder_days: z
    .string()
    .trim()
    .refine((v) => parseReminderDays(v) !== null, 'Liste de jours invalide (entiers positifs)'),
  reminder_repeat_days: z
    .string()
    .trim()
    .min(1, 'Valeur requise (0 = désactivé)')
    .refine((v) => /^\d+$/.test(v) && Number(v) <= 365, 'Nombre de jours invalide'),
})

export type ProfileInput = z.infer<typeof profileSchema>

export function normalizeIban(value: string): string {
  return stripSpaces(value).toUpperCase()
}

export const URSSAF_PERIOD_LABELS: Record<ProfileInput['urssaf_period'], string> = {
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
}

/**
 * Parse une saisie « 7, 14, 30 » en tableau d'entiers positifs, triés et
 * dédupliqués. Renvoie `null` si une valeur est invalide (mais accepte le
 * vide → `[]`).
 */
export function parseReminderDays(value: string): number[] | null {
  const parts = value
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const days: number[] = []
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const day = Number(part)
    if (day < 1 || day > 365) return null
    if (!days.includes(day)) days.push(day)
  }
  return days.sort((a, b) => a - b)
}

export function formatReminderDays(days: unknown): string {
  return Array.isArray(days) ? days.join(', ') : ''
}
