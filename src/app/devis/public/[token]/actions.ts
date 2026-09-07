'use server'

import { headers } from 'next/headers'

import { createClient } from '@/lib/server'

export type PublicQuoteActionResult = { ok: true } | { ok: false; error: string }

const NOT_PENDING = 'Ce devis a déjà été traité ou n’est plus valide.'

async function clientIp(): Promise<string | null> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return h.get('x-real-ip')
}

export async function acceptPublicQuote(
  token: string,
  signatureName: string
): Promise<PublicQuoteActionResult> {
  const name = signatureName.trim()
  if (name.length < 2) return { ok: false, error: 'Indiquez votre nom pour signer.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_public_quote', {
    p_token: token,
    p_signature_name: name,
    p_accepted_ip: (await clientIp()) ?? '',
  })
  if (error) {
    return {
      ok: false,
      error: error.message.includes('not_pending') ? NOT_PENDING : "L'acceptation a échoué.",
    }
  }

  // Le PDF signé est régénéré côté artisan (à l'ouverture du devis accepté /
  // bouton « Régénérer le PDF ») : l'anon ne peut pas écrire dans le Storage.
  // TODO (FAC-45) : publier un événement Realtime pour le dashboard artisan.
  return { ok: true }
}

export async function refusePublicQuote(token: string): Promise<PublicQuoteActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('refuse_public_quote', { p_token: token })
  if (error) {
    return { ok: false, error: error.message.includes('not_pending') ? NOT_PENDING : 'Le refus a échoué.' }
  }
  return { ok: true }
}
