'use server'

import { isAiConfigured, parseQuote, suggestItems } from '@/lib/ai/quote-ai'
import { createClient as createSupabaseClient } from '@/lib/server'
import { aiLineToFormLine, type ParsedQuote } from '@/lib/validations/ai'
import type { LineItemInput } from '@/lib/validations/quote'

type Ok<T> = { ok: true } & T
type Err = { ok: false; error: string }

const AI_OFF = "L'assistant IA n'est pas configuré (ANTHROPIC_API_KEY manquante)."
const GENERIC = 'La génération a échoué, réessayez.'

async function requireUser() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export type GenerateQuoteResult =
  Ok<{ title: string; items: LineItemInput[]; notes: string | null }> | Err

/** Génère un devis structuré (titre, lignes, notes) depuis une description libre. */
export async function generateQuoteFromText(text: string): Promise<GenerateQuoteResult> {
  const value = text.trim()
  if (value.length < 3) return { ok: false, error: 'Décrivez les travaux en quelques mots.' }
  if (value.length > 5000)
    return { ok: false, error: 'Description trop longue (5000 caractères max).' }
  if (!isAiConfigured()) return { ok: false, error: AI_OFF }
  if (!(await requireUser())) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  try {
    const parsed: ParsedQuote = await parseQuote(value)
    return {
      ok: true,
      title: parsed.title,
      items: parsed.items.map(aiLineToFormLine),
      notes: parsed.notes,
    }
  } catch (error) {
    console.error('[ai] parseQuote', error)
    return { ok: false, error: error instanceof Error ? error.message : GENERIC }
  }
}

export type SuggestItemsResult = Ok<{ items: LineItemInput[] }> | Err

/** Suggère 3 à 5 lignes complémentaires souvent oubliées pour un devis en cours. */
export async function suggestQuoteItems(
  context: string,
  trade?: string | null
): Promise<SuggestItemsResult> {
  const value = context.trim()
  if (value.length < 3) return { ok: false, error: 'Ajoutez au moins une ligne au devis.' }
  if (!isAiConfigured()) return { ok: false, error: AI_OFF }
  if (!(await requireUser())) return { ok: false, error: 'Session expirée. Reconnectez-vous.' }

  try {
    const suggested = await suggestItems(value.slice(0, 2000), trade)
    return { ok: true, items: suggested.items.map(aiLineToFormLine) }
  } catch (error) {
    console.error('[ai] suggestItems', error)
    return { ok: false, error: error instanceof Error ? error.message : GENERIC }
  }
}
