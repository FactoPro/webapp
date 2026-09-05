import { z } from 'zod'

export const CATALOG_UNITS = ['u', 'm²', 'ml', 'h', 'forfait'] as const
export type CatalogUnit = (typeof CATALOG_UNITS)[number]

export const CATALOG_UNIT_LABELS: Record<CatalogUnit, string> = {
  u: 'Unité',
  'm²': 'm²',
  ml: 'Mètre linéaire',
  h: 'Heure',
  forfait: 'Forfait',
}

const numericString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} requis`)
    .refine((value) => {
      const parsed = Number(value.replace(',', '.'))
      return Number.isFinite(parsed) && parsed >= 0
    }, `${label} invalide`)

export const catalogItemSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis').max(200),
  unit: z.enum(CATALOG_UNITS),
  unit_price: numericString('Prix'),
  vat_rate: numericString('Taux de TVA').refine(
    (value) => Number(value.replace(',', '.')) <= 100,
    'Taux de TVA invalide'
  ),
  category: z.string().trim().max(100),
})

export type CatalogItemInput = z.infer<typeof catalogItemSchema>

export function parseAmount(value: string): number {
  return Number(value.replace(',', '.'))
}
