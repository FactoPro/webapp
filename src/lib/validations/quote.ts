import { z } from 'zod'

import { CATALOG_UNITS } from './catalog-item'
import { numericString, parseAmount } from './number'

export { parseAmount }

/** Taux de TVA français courants (proposés dans un select, valeur libre possible). */
export const VAT_RATES = ['20', '10', '5.5', '2.1', '0'] as const

export const lineItemSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis').max(300),
  quantity: numericString('Quantité'),
  unit: z.enum(CATALOG_UNITS),
  unit_price: numericString('Prix unitaire'),
  vat_rate: numericString('Taux de TVA').refine(
    (v) => parseAmount(v) <= 100,
    'Taux de TVA invalide'
  ),
  catalog_item_id: z.union([z.string().uuid(), z.null()]),
})

export type LineItemInput = z.infer<typeof lineItemSchema>

export const DISCOUNT_MODES = ['none', 'preset', 'custom'] as const

export const quoteSchema = z
  .object({
    client_id: z.string().uuid('Sélectionnez un client'),
    title: z.string().trim().max(200),
    description: z.string().trim().max(2000),
    valid_until: z.string().trim(),
    notes: z.string().trim().max(2000),
    items: z.array(lineItemSchema).min(1, 'Ajoutez au moins une ligne'),
    discount_mode: z.enum(DISCOUNT_MODES),
    discount_preset_id: z.string().trim(),
    discount_kind: z.enum(['percent', 'fixed']),
    discount_value: z.string().trim(),
    discount_label: z.string().trim().max(200),
  })
  .superRefine((data, ctx) => {
    if (data.discount_mode === 'preset' && !data.discount_preset_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount_preset_id'],
        message: 'Choisissez une remise',
      })
    }
    if (data.discount_mode === 'custom') {
      const value = parseAmount(data.discount_value)
      if (!data.discount_value || !Number.isFinite(value) || value < 0) {
        ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Valeur invalide' })
      } else if (data.discount_kind === 'percent' && value > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['discount_value'],
          message: 'Un pourcentage ne peut pas dépasser 100',
        })
      }
    }
  })

export type QuoteInput = z.infer<typeof quoteSchema>

/** Résout la remise du formulaire en (kind, value, label) persistables. */
export function resolveDiscount(
  input: QuoteInput,
  presets: { id: string; kind: string; value: number; label: string }[]
): { kind: 'percent' | 'fixed' | null; value: number | null; label: string | null } {
  if (input.discount_mode === 'preset') {
    const preset = presets.find((p) => p.id === input.discount_preset_id)
    if (!preset) return { kind: null, value: null, label: null }
    return {
      kind: preset.kind === 'fixed' ? 'fixed' : 'percent',
      value: preset.value,
      label: preset.label,
    }
  }
  if (input.discount_mode === 'custom') {
    return {
      kind: input.discount_kind,
      value: parseAmount(input.discount_value),
      label: input.discount_label.trim() || 'Remise',
    }
  }
  return { kind: null, value: null, label: null }
}
