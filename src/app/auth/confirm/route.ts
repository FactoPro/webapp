import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/server'

/**
 * Point d'entrée des liens e-mail Supabase (confirmation d'inscription, récupération de
 * mot de passe, changement d'e-mail). Gère à la fois le flux PKCE (`?code=`) et le flux
 * OTP par hash de jeton (`?token_hash=&type=`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = new URL(next, request.url)
  const errorRedirect = new URL('/auth/auth-code-error', request.url)

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(error ? errorRedirect : redirectTo)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    return NextResponse.redirect(error ? errorRedirect : redirectTo)
  }

  return NextResponse.redirect(errorRedirect)
}
