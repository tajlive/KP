import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase-generated";

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
 * - Route Handler usage (synchronous):  createServerClient(request, response)
 * - Server Component usage (async):     await createServerClient()
 */
export function createServerClient(
  request?: NextRequest,
  response?: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Route Handler path — synchronous, needs request + response for cookie handling
  if (request && response) {
    return createSSRServerClient<Database>(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });
  }

  // Server Component / Server Action path — async, reads from next/headers
  return (async () => {
    const cookieStore = await cookies();
    return createSSRServerClient<Database>(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
  })();
}
