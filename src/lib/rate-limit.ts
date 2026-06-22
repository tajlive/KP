import { getRedisRest } from "./redis-client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Distributed fixed-window rate limiter backed by Cloudflare KV or Upstash.
 * Production fails closed when no shared backend is configured.
 */
export async function checkDistributedRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000,
): Promise<RateLimitResult> {
  const store = getRedisRest();
  if (!store) {
    return {
      allowed: process.env.NODE_ENV !== "production",
      remaining: 0,
    };
  }

  const window = Math.floor(Date.now() / windowMs);
  const storageKey = `rate-limit:${key}:${window}`;

  try {
    const count = await store.incr(storageKey);
    if (count === 1) {
      await store.pexpire(storageKey, windowMs + 5_000);
    }
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch (error) {
    console.error("[RateLimit] Shared store failed:", error);
    return {
      allowed: process.env.NODE_ENV !== "production",
      remaining: 0,
    };
  }
}
