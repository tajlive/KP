/**
 * Singleton Supabase browser client.
 *
 * KRITISK: Aldri opprett flere instanser — én per browser-session.
 * Lock "sb-*-auth-token" kan ikke deles mellom instanser og vil
 * forårsake "gotrue-js lock not released within 5000ms" feil.
 *
 * OAuth/PKCE: Vi bruker IKKE custom storage (localStorage) her. @supabase/ssr
 * må lagre code_verifier i cookies slik at server-callback kan lese den ved
 * exchangeCodeForSession. Med storage: safeStorage (localStorage) havnet
 * brukeren tilbake på innlogging etter Google fordi serveren ikke så verifier.
 *
 * @usage
 * import { getSupabaseClient } from '@/lib/supabase/client'
 * const supabase = getSupabaseClient()
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/supabase-generated'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

// Module-level singleton — survives HMR and React re-renders
let _client: SupabaseClient | null = null

/**
 * Get the singleton Supabase browser client.
 * Creates the client on first call, returns cached instance thereafter.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'raw',
      global: {
        headers: {
          'x-client-info': 'klarpakke/1.0',
        },
      },
    }
  )

  return _client
}

/**
 * Legacy alias for getSupabaseClient.
 * @deprecated Use getSupabaseClient() instead for clarity.
 */
export function createClient(): SupabaseClient {
  return getSupabaseClient()
}

// Type-safe helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
