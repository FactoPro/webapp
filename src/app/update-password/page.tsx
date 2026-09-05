import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/server'

import { UpdatePasswordForm } from './update-password-form'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/reset-password')

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="font-heading text-lg font-semibold">
        FactoPro
      </Link>
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
