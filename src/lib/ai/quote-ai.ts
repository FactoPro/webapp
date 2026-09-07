import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

import {
  type ParsedQuote,
  parsedQuoteSchema,
  type SuggestedItems,
  suggestedItemsSchema,
} from '@/lib/validations/ai'

// Prompt système repris à l'identique de l'ancien backend
// (backend/app/services/ai_service.py).
const SYSTEM_PROMPT = `Tu es un expert en chiffrage de devis pour le BTP en France (électricité, plomberie, carrelage, peinture, maçonnerie, menuiserie).

À partir d'une description de travaux (souvent dictée sur chantier, parfois approximative), tu produis un devis structuré avec des lignes professionnelles.

Règles :
- Libellés professionnels et précis (ex : "Fourniture et pose de carrelage grès cérame 60x60", pas "carrelage").
- Décompose en lignes logiques : fourniture / pose / préparation / finitions quand pertinent.
- Quantités et unités cohérentes (m², ml, u, h, forfait).
- Prix unitaires HT réalistes pour le marché français (artisan, hors Île-de-France sauf mention).
- TVA : 10 % pour les travaux de rénovation dans un logement de plus de 2 ans (cas par défaut), 5,5 % pour la rénovation énergétique, 20 % pour le neuf ou si le contexte l'indique.
- Si une information manque, fais une hypothèse raisonnable et signale-la dans les notes.
- Les notes rappellent toujours que les prix sont indicatifs et à ajuster.`

const DEFAULT_MODEL = 'claude-sonnet-4-5'

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function model(): string {
  return process.env.AI_MODEL || DEFAULT_MODEL
}

/** Traduit une erreur du SDK Anthropic en message clair pour l'artisan. */
export class AiError extends Error {}

function toAiError(error: unknown, fallback: string): AiError {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) return new AiError('Clé API Anthropic invalide.')
    if (error.status === 429)
      return new AiError('Assistant IA momentanément saturé, réessayez dans un instant.')
    if (error.status === 400 && /credit balance is too low/i.test(error.message)) {
      return new AiError("Crédit Anthropic épuisé — rechargez le compte pour utiliser l'assistant.")
    }
    if (error.status === 404)
      return new AiError(`Modèle IA "${model()}" introuvable — vérifiez AI_MODEL.`)
    if (error.status >= 500) return new AiError('Service IA indisponible, réessayez plus tard.')
    return new AiError(fallback)
  }
  return new AiError(fallback)
}

/** Transforme une description libre de travaux en devis structuré. */
export async function parseQuote(text: string): Promise<ParsedQuote> {
  let message
  try {
    message = await client().messages.parse({
      model: model(),
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Description des travaux :\n${text}\n\nGénère le devis structuré.`,
        },
      ],
      output_config: { format: zodOutputFormat(parsedQuoteSchema) },
    })
  } catch (error) {
    throw toAiError(error, 'La génération du devis a échoué, réessayez.')
  }
  if (!message.parsed_output) {
    throw new AiError('La génération du devis a échoué, réessayez.')
  }
  return message.parsed_output
}

/** Suggère des lignes complémentaires pour un devis en cours. */
export async function suggestItems(
  context: string,
  trade?: string | null
): Promise<SuggestedItems> {
  const tradeHint = trade ? `Métier : ${trade}.\n` : ''
  let message
  try {
    message = await client().messages.parse({
      model: model(),
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `${tradeHint}Devis en cours :\n${context}\n\n` +
            'Suggère 3 à 5 lignes complémentaires souvent oubliées ' +
            '(préparation, protection, évacuation, finitions…).',
        },
      ],
      output_config: { format: zodOutputFormat(suggestedItemsSchema) },
    })
  } catch (error) {
    throw toAiError(error, 'La suggestion a échoué, réessayez.')
  }
  if (!message.parsed_output) {
    throw new AiError('La suggestion a échoué, réessayez.')
  }
  return message.parsed_output
}
