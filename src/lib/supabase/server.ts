/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Database } from "../../types/supabase-generated";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

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

  // Route Handler path — synchronous, needs request + response for cookie handling
  if (request && response) {
    return createSSRServerClient<Database>(url, key, {
      cookieEncoding: "raw",
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: any) => {
          cookiesToSet.forEach((cookie: any) => {
            const { name, value, options } = cookie;
            // Only set on response; request.cookies is read-only in Next.js
            response.cookies.set(name, value, options);
          });
        },
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
        setAll: (cookiesToSet: any) => {
          cookiesToSet.forEach((cookie: any) => {
            const { name, value, options } = cookie;
            cookieStore.set(name, value, options);
          });
        },
      },
    });
  })();
}
