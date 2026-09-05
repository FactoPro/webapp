'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/server'
import {
  loginSchema,
  registerSchema,
  resetRequestSchema,
  updatePasswordSchema,
} from '@/lib/validations/auth'

export type ActionResult = { error: string } | undefined

async function getOrigin(): Promise<string> {
  const headerList = await headers()
  const origin = headerList.get('origin')
  if (origin) return origin
  const host = headerList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'E-mail ou mot de passe incorrect.' }

  redirect('/dashboard')
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/dashboard` },
  })

  if (error) {
    if (error.code === 'user_already_exists') {
      return { error: 'Un compte existe déjà avec cette adresse e-mail.' }
    }
    if (error.code === 'weak_password') {
      return { error: 'Mot de passe trop faible. Choisissez-en un plus complexe.' }
    }
    if (error.status === 429) {
      return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }
    }
    return { error: "L'inscription a échoué. Réessayez." }
  }

  // Email confirmation disabled → session ouverte immédiatement.
  if (data.session) redirect('/dashboard')

  // Email confirmation activée → l'utilisateur doit valider son adresse.
  redirect('/register/check-email')
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: 'Adresse e-mail invalide.' }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getOrigin()}/auth/confirm?next=/update-password`,
  })

  // Réponse volontairement neutre (ne pas divulguer l'existence d'un compte).
  redirect('/reset-password/check-email')
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Lien expiré ou invalide. Redemandez une réinitialisation.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: 'La mise à jour du mot de passe a échoué.' }

  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
