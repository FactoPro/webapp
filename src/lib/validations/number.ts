import { z } from 'zod'

/** Parse une saisie utilisateur décimale (virgule ou point) en nombre. */
export function parseAmount(value: string): number {
  return Number(value.replace(',', '.'))
}

/** Champ texte représentant un nombre positif (virgule ou point acceptée). */
export function numericString(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} requis`)
    .refine((value) => {
      const parsed = parseAmount(value)
      return Number.isFinite(parsed) && parsed >= 0
    }, `${label} invalide`)
}
