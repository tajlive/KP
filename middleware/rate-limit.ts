// ═══════════════════════════════════════════════════════════════
// Global Rate Limiting for API Routes
// Production-hardened with Redis backing + memory fallback
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";

export interface RateLimitConfig {
  max: number;        // requests per window
  window: number;     // window in seconds
  keyPrefix?: string; // Redis key prefix
}

// Production-tuned limits by route category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth: Strict (prevent brute force)
  auth: { max: 10, window: 60, keyPrefix: "rl:auth" },
  
  // Trading operations: Moderate (prevent spam, allow normal use)
  trading: { max: 60, window: 60, keyPrefix: "rl:trading" },
  paperTrading: { max: 100, window: 60, keyPrefix: "rl:paper" },
  
  // Market data: Lenient (read-heavy)
  market: { max: 300, window: 60, keyPrefix: "rl:market" },
  
  // Webhooks: Per-source limiting (Stripe, Resend)
  webhook: { max: 200, window: 60, keyPrefix: "rl:webhook" },
  
  // Admin: Strict (privileged operations)
  admin: { max: 30, window: 60, keyPrefix: "rl:admin" },
  
  // Internal/health: Whitelisted (no limit)
  internal: { max: 1000, window: 60, keyPrefix: "rl:internal" },
  
  // Default fallback
  default: { max: 120, window: 60, keyPrefix: "rl:default" },
};

// In-memory fallback for local dev / missing Redis
const memoryStore = new Map<string, { count: number; resetTime: number }>();
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min

// Periodic cleanup of memory store
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore) {
    if (value.resetTime < now) {
      memoryStore.delete(key);
    }
  }
}, MEMORY_CLEANUP_INTERVAL);

/**
 * Determine rate limit category from pathname
 */
function getRateLimitCategory(pathname: string): keyof typeof RATE_LIMITS {
  if (pathname.startsWith("/api/health")) return "internal";
  if (pathname.startsWith("/api/auth/") || pathname.includes("/login") || pathname.includes("signup")) return "auth";
  if (pathname.startsWith("/api/admin/")) return "admin";
  if (pathname.startsWith("/api/webhooks/")) return "webhook";
  if (pathname.startsWith("/api/paper-trading/")) return "paperTrading";
  if (pathname.startsWith("/api/trading") || pathname.startsWith("/api/trading-sessions/")) return "trading";
  if (pathname.startsWith("/api/market/")) return "market";
  if (pathname.startsWith("/api/cron/")) return "internal"; // Cron has its own auth
  return "default";
}

/**
 * Get identifier for rate limiting (IP + route category)
 */
function getIdentifier(request: NextRequest, category: string): string {
  // Use CF-Connecting-IP or X-Forwarded-For if behind proxy
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             request.headers.get("cf-connecting-ip") ||
             "anonymous";
  
  return `${category}:${ip}`;
}

/**
 * Check rate limit using Redis (preferred) or memory fallback
 */
async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const redis = getRedisRest();
  const now = Date.now();
  const windowMs = config.window * 1000;
  const reset = now + windowMs;
  
  if (redis) {
    // Redis-backed rate limiting with proper TTL
    const key = `rate_limit:${config.keyPrefix}:${identifier}`;
    
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, windowMs);
    
    const results = await pipeline.exec<[number, number]>();
    const count = results[0];
    
    return {
      allowed: count <= config.max,
      remaining: Math.max(0, config.max - count),
      reset,
    };
  } else {
    // Memory fallback
    const key = `${config.keyPrefix}:${identifier}`;
    const record = memoryStore.get(key);
    
    if (!record || record.resetTime < now) {
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: config.max - 1, reset };
    }
    
    record.count++;
    memoryStore.set(key, record);
    
    return {
      allowed: record.count <= config.max,
      remaining: Math.max(0, config.max - record.count),
      reset: record.resetTime,
    };
  }
}

/**
 * Middleware-compatible rate limit check
 * Returns NextResponse if rate limited, null if allowed
 */
export async function rateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for internal/health checks (they have own auth)
  if (pathname.startsWith("/api/health") || pathname.startsWith("/api/cron/")) {
    return null;
  }
  
  const category = getRateLimitCategory(pathname);
  const config = RATE_LIMITS[category];
  const identifier = getIdentifier(request, category);
  
  const result = await checkRateLimit(identifier, config);
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    
    return NextResponse.json(
      { 
        error: "Rate limit exceeded",
        category,
        retry_after: retryAfter,
        limit: config.max,
        window: config.window,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
        },
      }
    );
  }
  
  // Return null to continue (caller should add headers if needed)
  return null;
}

/**
 * HOF for adding rate limit headers to successful responses
 */
export function withRateLimitHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const category = getRateLimitCategory(pathname);
  const config = RATE_LIMITS[category];
  
  response.headers.set("X-RateLimit-Limit", String(config.max));
  response.headers.set("X-RateLimit-Category", category);
  
  return response;
}

// Export for testing
export { checkRateLimit, getRateLimitCategory, getIdentifier };
