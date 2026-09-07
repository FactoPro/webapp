import { z } from 'zod'

import { parseAmount } from './number'

export { parseAmount }

/** Modes de règlement proposés (valeur libre acceptée côté formulaire). */
export const PAYMENT_METHODS = ['Virement', 'Chèque', 'Espèces', 'Carte', 'Autre'] as const

export const paymentSchema = z.object({
  /** Vide = solde complet restant dû. */
  amount: z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(parseAmount(v)) && parseAmount(v) > 0), {
      message: 'Montant invalide',
    }),
  payment_method: z.string().trim().max(50),
  notes: z.string().trim().max(500),
})

export type PaymentInput = z.infer<typeof paymentSchema>
