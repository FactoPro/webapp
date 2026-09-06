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
})

export type ProfileInput = z.infer<typeof profileSchema>

export function normalizeIban(value: string): string {
  return stripSpaces(value).toUpperCase()
}
