/**
 * Singleton Supabase browser client
 * 
 * KRITISK: Aldri opprett flere instanser — én per browser-session.
 * Invalid refresh token detection: wraps getSession/getUser to sign out
 * immediately and block subsequent auth calls, preventing retry storms.
 * 
 * @usage
 * import { getSupabaseClient } from '@/lib/supabase/client'
 * const supabase = getSupabaseClient()
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";


type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

// Module-level singleton — survives HMR and React re-renders
let _client: SupabaseClient | null = null;

function getBrowserCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (host === "localhost" || host.includes(":")) return undefined;
  const rootDomain = host.replace(/^www\./, "");
  return `.${rootDomain}`;
}

/** Message thrown when Supabase env vars are missing */
export const CONFIG_ERROR_MSG =
  "Supabase er ikke konfigurert. Sjekk at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er satt.";

/**
 * Get the singleton Supabase browser client
 * NOTE: Token refresh is handled by AuthContext to prevent race conditions
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
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
      cookieOptions: {
        sameSite: "none",
        secure: true,
        domain: getBrowserCookieDomain(),
      },

      auth: {
        persistSession: true,
        detectSessionInUrl: false, // AuthHashHandler handles hash parsing exclusively
        autoRefreshToken: false,   // Stop background timer; explicit getSession() refreshes only
      },
      global: {
        headers: {
          "x-client-info": "klarpakke/1.0",
        },
      },
    });
    
    // Guard against retry storms when refresh token is invalid
    let invalidTokenDetected = false;

    const originalGetSession = _client.auth.getSession.bind(_client.auth);
    _client.auth.getSession = async () => {
      if (invalidTokenDetected) {
        return { data: { session: null }, error: null } as Awaited<ReturnType<typeof originalGetSession>>;
      }
      const result = await originalGetSession();
      if (result.error?.message?.includes("Invalid Refresh Token")) {
        invalidTokenDetected = true;
        await _client!.auth.signOut();
      }
      return result;
    };

    const originalGetUser = _client.auth.getUser.bind(_client.auth);
    _client.auth.getUser = async () => {
      if (invalidTokenDetected) {
        return { data: { user: null }, error: null } as unknown as Awaited<ReturnType<typeof originalGetUser>>;
      }
      const result = await originalGetUser();
      if (result.error?.message?.includes("Invalid Refresh Token")) {
        invalidTokenDetected = true;
        await _client!.auth.signOut();
      }
      return result;
    };

    // Minimal auth state listener - only for logging
    _client.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Supabase] Auth event: ${event}`, session ? 'has session' : 'no session');
      }
    });
    
  } catch (err) {
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
