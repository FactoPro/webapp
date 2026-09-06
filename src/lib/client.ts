import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database'

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>

// Client navigateur en singleton : plusieurs instances feraient tourner
// plusieurs boucles d'auto-refresh en parallèle et se voleraient le
// refresh token (déconnexions aléatoires).
let client: BrowserClient | undefined

export function createClient(): BrowserClient {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
  return client
}
