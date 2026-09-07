import { z } from 'zod'

import { CATALOG_UNITS, type CatalogUnit } from './catalog-item'
import type { LineItemInput } from './quote'

const UNIT_ALIASES: Record<string, CatalogUnit> = {
  m2: 'm²',
  'm³': 'm²',
  m3: 'm²',
  'mètre linéaire': 'ml',
  metre: 'ml',
  ml: 'ml',
  heure: 'h',
  heures: 'h',
  jour: 'h',
  jours: 'h',
  j: 'h',
  unité: 'u',
  unite: 'u',
  unités: 'u',
  piece: 'u',
  pièce: 'u',
  pce: 'u',
  ens: 'forfait',
  ensemble: 'forfait',
  ft: 'forfait',
  fft: 'forfait',
  forfaits: 'forfait',
}

/** Normalise une unité renvoyée par l'IA vers l'une des unités du catalogue. */
export function normalizeUnit(raw: string): CatalogUnit {
  const key = raw.trim().toLowerCase()
  if ((CATALOG_UNITS as readonly string[]).includes(key)) return key as CatalogUnit
  return UNIT_ALIASES[key] ?? 'u'
}

/**
 * Schéma des lignes produites par l'assistant IA (types numériques, plus
 * naturels pour le modèle). `unit` est laissée libre puis normalisée vers une
 * unité du catalogue par {@link aiLineToFormLine} (les transforms Zod ne sont
 * pas représentables en JSON Schema, donc pas dans le schéma envoyé au modèle).
 */
export const aiLineItemSchema = z.object({
  label: z.string().min(1).max(300),
  quantity: z.number().positive(),
  unit: z.string().min(1).describe('Unité de la ligne : u, m², ml, h ou forfait'),
  unit_price: z.number().min(0),
  vat_rate: z.number().min(0).max(20),
})
export type AiLineItem = z.infer<typeof aiLineItemSchema>

/** Sortie de `parseQuote` : un devis structuré depuis une description libre. */
export const parsedQuoteSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(aiLineItemSchema).min(1),
  notes: z.string().max(2000).nullable(),
})
export type ParsedQuote = z.infer<typeof parsedQuoteSchema>

/** Sortie de `suggestItems` : 3 à 5 lignes complémentaires souvent oubliées. */
export const suggestedItemsSchema = z.object({
  items: z.array(aiLineItemSchema).min(1).max(8),
})
export type SuggestedItems = z.infer<typeof suggestedItemsSchema>

/** Convertit une ligne IA (numérique) vers la ligne du formulaire (chaînes). */
export function aiLineToFormLine(line: AiLineItem): LineItemInput {
  return {
    label: line.label,
    quantity: String(line.quantity),
    unit: normalizeUnit(line.unit),
    unit_price: String(line.unit_price),
    vat_rate: String(line.vat_rate),
    catalog_item_id: null,
  }
}
