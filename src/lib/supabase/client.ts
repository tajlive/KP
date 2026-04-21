/**
 * Singleton Supabase browser client
 *
 * KRITISK: Aldri opprett flere instanser — én per browser-session.
 *
 * Invalid refresh token protection:
 * - global.fetch wrapper intercepts ALL refresh_token requests at the network level,
 *   blocking them immediately after the first 400 response. This stops gotrue-js
 *   internal retry cascades that bypass method-level wrappers.
 * - getSession/getUser wrappers return null fast when invalidTokenDetected is true.
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

// Module-level guard — shared across all getSupabaseClient() calls
// Persisted in sessionStorage so it survives full page reloads (prevents refresh loops)
const SESSION_STORAGE_KEY = "sb_invalid_token_guard";
let invalidTokenDetected =
  typeof window !== "undefined" && sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";
let refreshPromise: Promise<Response> | null = null;

/** Reset the invalid token guard (call after successful login) */
export function resetInvalidTokenGuard(): void {
  invalidTokenDetected = false;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function getBrowserCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (host === "localhost" || host.includes(":")) return undefined;
  const rootDomain = host.replace(/^www\./, "");
  return `.${rootDomain}`;
}

/** Synthetic 400 response for blocked refresh attempts */
function syntheticRefreshError(): Response {
  return new Response(
    JSON.stringify({
      error: "invalid_grant",
      error_description: "Invalid Refresh Token: Refresh Token Not Found",
    }),
    {
      status: 400,
      headers: { "content-type": "application/json" },
    },
  );
}

/** Message thrown when Supabase env vars are missing */
export const CONFIG_ERROR_MSG =
  "Supabase er ikke konfigurert. Sjekk at NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY er satt.";

/**
 * Get the singleton Supabase browser client
 *
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

  const originalFetch = fetch.bind(globalThis);

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
        autoRefreshToken: false, // Stop background timer; explicit getSession() refreshes only
      },
      global: {
        /**
         * Fetch wrapper that guards the refresh_token endpoint.
         * This is the MOST CRITICAL defence — it operates at the network layer,
         * catching gotrue-js internal _refreshAccessToken calls that bypass
         * method-level wrappers.
         */
        fetch: async (
          input: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ): Promise<Response> => {
          const urlStr =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.toString()
                : input.url;

          // Only intercept refresh token requests
          if (!urlStr.includes("grant_type=refresh_token")) {
            return originalFetch(input, init);
          }

          // Block all subsequent refresh attempts after first invalid token
          if (invalidTokenDetected) {
            return syntheticRefreshError();
          }

          // Serialize refresh attempts so only ONE reaches the server.
          // Concurrent calls all wait for the same promise result.
          if (refreshPromise) {
            return refreshPromise;
          }

          refreshPromise = originalFetch(input, init)
            .then((response) => {
              // Any 400 from the refresh endpoint means the token is invalid.
              // Set the flag immediately so the next concurrent call is blocked.
              if (response.status === 400) {
                invalidTokenDetected = true;
                if (typeof window !== "undefined") {
                  sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
                }
              }
              refreshPromise = null;
              return response;
            })
            .catch((err) => {
              refreshPromise = null;
              throw err;
            });

          return refreshPromise;
        },
        headers: {
          "x-client-info": "klarpakke/1.0",
        },
      },
    });

    // Fast-path wrappers for getSession/getUser — return null without
    // entering gotrue-js when the token is already known to be invalid.
    const originalGetSession = _client.auth.getSession.bind(_client.auth);
    _client.auth.getSession = async () => {
      if (invalidTokenDetected) {
        return {
          data: { session: null },
          error: null,
        } as Awaited<ReturnType<typeof originalGetSession>>;
      }
      return originalGetSession();
    };

    const originalGetUser = _client.auth.getUser.bind(_client.auth);
    _client.auth.getUser = async () => {
      if (invalidTokenDetected) {
        return {
          data: { user: null },
          error: null,
        } as unknown as Awaited<ReturnType<typeof originalGetUser>>;
      }
      return originalGetUser();
    };

    // Auth state listener — reset invalid token guard on successful auth events
    _client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        invalidTokenDetected = false;
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Supabase] Auth event: ${event}`,
          session ? "has session" : "no session",
        );
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
