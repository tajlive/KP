/**
 * API Authorization Helper
 *
 * Provides secure user authentication for API routes using Supabase JWT validation.
 *
 * Usage in API routes:
 * ```typescript
 * import { withAuth } from '@/lib/api-auth';
 *
 * export const GET = withAuth(async (request, { user }) => {
 *   // user.id is guaranteed to be present
 *   return NextResponse.json({ userId: user.id });
 * });
 * ```
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: AuthenticatedRequest["user"] },
) => Promise<Response> | Response;

type AuthUser = {
  id: string;
  email?: string;
  role?: string;
};

function forwardSessionCookies(from: NextResponse, to: NextResponse): void {
  const list = from.headers.getSetCookie?.() ?? [];
  for (const cookie of list) {
    to.headers.append("Set-Cookie", cookie);
  }
}

/**
 * Bearer JWT (mobil/CLI) eller Supabase-cookies (nettleser / same-origin fetch).
 * Ved cookie-bruk returneres en sidecar-respons som må flettes inn i API-svaret
 * slik at session refresh (Set-Cookie) ikke mistes.
 */
async function getRequestUser(
  request: NextRequest,
): Promise<{ user: AuthUser; cookieSidecar: NextResponse | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(url, anon);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      cookieSidecar: null,
    };
  }

  const cookieSidecar = NextResponse.next({
    request: { headers: request.headers },
  });
  const supabase = createServerClient(request, cookieSidecar);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return {
    user: {
      id: user.id,
      email: user.email,
    },
    cookieSidecar,
  };
}

/**
 * Higher-order function to protect API routes with authentication
 *
 * @param handler - The API route handler
 * @returns Protected API route handler
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context?: unknown) => {
    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const auth = await getRequestUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Sign in or send Authorization: Bearer <access_token>.",
        },
        { status: 401 },
      );
    }

    try {
      const res = await handler(request, { user: auth.user });
      if (auth.cookieSidecar && res instanceof NextResponse) {
        forwardSessionCookies(auth.cookieSidecar, res);
      }
      return res;
    } catch (error) {
      console.error("API handler error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Higher-order function to protect API routes with role-based access control
 *
 * P0-5-fiks (2026-08-06): Rollen verifiseres fra DB (user_profiles.role),
 * ALDRI fra JWT-metadata. `user_metadata` er klient-skrivbar via
 * `supabase.auth.updateUser({data:{role:"admin"}})` — en lavprivilegert bruker
 * kunne selv-promotere seg til admin på ruter beskyttet med `withRole`.
 *
 * @param allowedRoles - Array of allowed roles
 * @param handler - The API route handler
 * @returns Protected API route handler with RBAC
 */
export function withRole(
  allowedRoles: string[],
  handler: AuthenticatedHandler,
) {
  return withAuth(async (request, { user }) => {
    // Rollen hentes fra DB, ikke fra user_metadata (klient-skrivbar) eller
    // app_metadata (kan være utdatert). Fail-closed: DB-feil → 403.
    let dbRole: string | null = null;
    try {
      const db = getServiceRoleClient();
      const { data: profile, error } = await db
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && profile) {
        dbRole = profile.role;
      }
    } catch {
      dbRole = null;
    }

    if (!dbRole || !allowedRoles.includes(dbRole)) {
      return NextResponse.json(
        { error: "Forbidden. Insufficient permissions." },
        { status: 403 },
      );
    }

    return handler(request, { user: { ...user, role: dbRole } });
  });
}

/**
 * Validate service role key for admin operations
 * Only use this for server-side operations that require elevated privileges
 */
export function getServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Rate limiting helper (basic in-memory implementation)
 * For production, use Upstash Rate Limit or similar
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  // Clean up expired entries
  if (record && record.resetTime < now) {
    requestCounts.delete(identifier);
  }

  // Get or create record
  const current = requestCounts.get(identifier) || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Check limit
  if (current.count >= maxRequests) {
    return false;
  }

  // Increment and update
  current.count++;
  requestCounts.set(identifier, current);

  return true;
}

/**
 * Higher-order function to add rate limiting to API routes
 *
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 * @param handler - The API route handler
 * @returns Rate-limited API route handler
 */
export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000,
  handler: AuthenticatedHandler,
) {
  return withAuth(async (request, context) => {
    const identifier = context.user.id;

    if (!rateLimit(identifier, maxRequests, windowMs)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
        },
      );
    }

    return handler(request, context);
  });
}
