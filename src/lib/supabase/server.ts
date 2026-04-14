import type { Database } from "@/types/database.types";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createRefreshProtectedFetch } from "@/lib/auth/refresh-guard";

// Cookie domain helper - must match auth-guard.ts for consistency
function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") || "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.replace("www.", "") : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Creates a Supabase service-role client (elevated privileges, bypasses RLS).
 * Use in API routes and Server Actions that need full DB access.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Creates a Supabase SSR client.
 *
 * Usage:
 * - Route Handler (sync): createServerClient(request, response)
 * - Server Component (async): await createServerClient()
 */

export function createServerClient(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient<Database>;
// eslint-disable-next-line no-redeclare
export function createServerClient(): Promise<SupabaseClient<Database>>;
// eslint-disable-next-line no-redeclare
export function createServerClient(
  request?: NextRequest,
  response?: NextResponse,
): SupabaseClient<Database> | Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const protectedFetch = createRefreshProtectedFetch(globalThis.fetch, {
    source: request ? "middleware" : "server",
    path: request?.nextUrl?.pathname,
  });

  // Route Handler path — synchronous, needs request + response for cookie handling
  if (request && response) {
    const cookieDomain = getCookieDomain(request);
    return createSSRServerClient<Database>(url, key, {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: SupabaseCookie[]) => {
          cookiesToSet.forEach((cookie) => {
            const { name, value, options } = cookie;
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
              sameSite: "none" as const,
              secure: true,
            });
          });
        },
      },
      global: {
        fetch: protectedFetch,
      },
    });
  }

  // Server Component / Server Action path — async, reads from next/headers
  // We return the Promise directly to be awaited
  return (async () => {
    const cookieStore = await cookies();
    return createSSRServerClient<Database>(url, key, {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: SupabaseCookie[]) => {
          try {
            cookiesToSet.forEach((cookie) => {
              const { name, value, options } = cookie;
              cookieStore.set(name, value, options);
            });
          } catch {
            // Next.js 15+: cookieStore.set er ikke tillatt i RSC — sesjonsoppdatering skjer i middleware/route.
            // getUser() kan fortsatt trigge Supabase refresh-kall som forsøker setAll; ignorer her.
          }
        },
      },
      global: {
        fetch: protectedFetch,
      },
    });
  })();
}
