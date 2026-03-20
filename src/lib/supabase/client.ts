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
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/supabase-generated";

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

// Module-level singleton — survives HMR and React re-renders
let _client: SupabaseClient | null = null;

/** Message thrown when Supabase env vars are missing. Check with: err.message.startsWith('Supabase er ikke konfigurert') */
export const CONFIG_ERROR_MSG =
  "Supabase er ikke konfigurert. Sjekk at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er satt: Lokalt i .env.local eller .env; på Vercel i Project Settings → Environment Variables. Variablene må være tilgjengelige ved byggetid (NEXT_PUBLIC_* inlines i klienten).";

/**
 * Get the singleton Supabase browser client.
 * Creates the client on first call, returns cached instance thereafter.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isPlaceholder =
    !url ||
    !key ||
    typeof url !== "string" ||
    typeof key !== "string" ||
    url.length < 10 ||
    url.includes("your-project") ||
    key.includes("your_") ||
    key === "placeholder";
  if (isPlaceholder) {
    throw new Error(CONFIG_ERROR_MSG);
  }

  try {
    _client = createBrowserClient<Database>(url, key, {
      cookieEncoding: "raw",
      global: {
        headers: {
          "x-client-info": "klarpakke/1.0",
        },
      },
    });
  } catch (err) {
    // @supabase/ssr throws when url/key invalid; convert to our config error
    if (
      err instanceof Error &&
      /required.*create a Supabase client|URL and API key are required/i.test(
        err.message,
      )
    ) {
      throw new Error(CONFIG_ERROR_MSG);
    }
    throw err;
  }

  return _client;
}

/**
 * Legacy alias for getSupabaseClient.
 * @deprecated Use getSupabaseClient() instead for clarity.
 */
export function createClient(): SupabaseClient {
  return getSupabaseClient();
}

// Type-safe helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
