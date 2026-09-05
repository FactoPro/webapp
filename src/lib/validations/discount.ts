import { z } from 'zod'

import { numericString, parseAmount } from './number'

export { parseAmount }

export const DISCOUNT_KINDS = ['percent', 'fixed'] as const
export type DiscountKind = (typeof DISCOUNT_KINDS)[number]

export const DISCOUNT_KIND_LABELS: Record<DiscountKind, string> = {
  percent: 'Pourcentage',
  fixed: 'Montant fixe',
}

export const discountSchema = z
  .object({
    label: z.string().trim().min(1, 'Libellé requis').max(200),
    kind: z.enum(DISCOUNT_KINDS),
    value: numericString('Valeur'),
  })
  .refine((data) => data.kind !== 'percent' || parseAmount(data.value) <= 100, {
    message: 'Un pourcentage ne peut pas dépasser 100',
    path: ['value'],
  })

export type DiscountInput = z.infer<typeof discountSchema>
