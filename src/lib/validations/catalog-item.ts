import { z } from 'zod'

import { numericString, parseAmount } from './number'

export { parseAmount }

export const CATALOG_UNITS = ['u', 'm²', 'ml', 'h', 'forfait'] as const
export type CatalogUnit = (typeof CATALOG_UNITS)[number]

export const CATALOG_UNIT_LABELS: Record<CatalogUnit, string> = {
  u: 'Unité',
  'm²': 'm²',
  ml: 'Mètre linéaire',
  h: 'Heure',
  forfait: 'Forfait',
}

export const catalogItemSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis').max(200),
  unit: z.enum(CATALOG_UNITS),
  unit_price: numericString('Prix'),
  vat_rate: numericString('Taux de TVA').refine(
    (value) => parseAmount(value) <= 100,
    'Taux de TVA invalide'
  ),
  category: z.string().trim().max(100),
})

export type CatalogItemInput = z.infer<typeof catalogItemSchema>
