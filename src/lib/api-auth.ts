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

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: AuthenticatedRequest['user'] }
) => Promise<Response> | Response;

/**
 * Extract and validate JWT token from request headers
 */
async function validateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Create Supabase client for token validation
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Verify token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || user.app_metadata?.role
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
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate token
    const user = await validateToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide a valid authentication token.' },
        { status: 401 }
      );
    }

    // Call handler with authenticated user
    try {
      return await handler(request, { user });
    } catch (error) {
      console.error('API handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function to protect API routes with role-based access control
 *
 * @param allowedRoles - Array of allowed roles
 * @param handler - The API route handler
 * @returns Protected API route handler with RBAC
 */
export function withRole(allowedRoles: string[], handler: AuthenticatedHandler) {
  return withAuth(async (request, { user }) => {
    if (!user.role || !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
    }

    return handler(request, { user });
  });
}

/**
 * Validate service role key for admin operations
 * Only use this for server-side operations that require elevated privileges
 */
export function getServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Rate limiting helper (basic in-memory implementation)
 * For production, use Upstash Rate Limit or similar
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
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
    resetTime: now + windowMs
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
  handler: AuthenticatedHandler
) {
  return withAuth(async (request, context) => {
    const identifier = context.user.id;

    if (!rateLimit(identifier, maxRequests, windowMs)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
      );
    }

    return handler(request, context);
  });
}
