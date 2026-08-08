import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";

/**
 * Simple in-memory rate limiter for trading API routes.
 * Limits requests per IP per window.
 * 
 * For production scale, replace with Upstash Redis or Cloudflare Rate Limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/trading": { max: 60, windowMs: 60_000 },        // 60 req/min for trading
  "/api/ai/chat": { max: 20, windowMs: 60_000 },        // 20 req/min for AI chat (costly API calls)
  
  "/api/webhooks/stripe": { max: 100, windowMs: 60_000 }, // Stripe webhooks (unlimited)
  "/api/cron": { max: 100, windowMs: 60_000 },           // Cron jobs (unlimited via CRON_SECRET)
};

function getClientIp(request: NextRequest): string {
  return request.headers.get("cf-connecting-ip") 
    ?? request.headers.get("x-forwarded-for") 
    ?? "unknown";
}

export const rateLimitMiddleware: MiddlewareFn = (
  request: NextRequest,
  _response?: NextResponse,
) => {
  const pathname = request.nextUrl.pathname;
  
  // Find matching rate limit
  const matchedPath = Object.keys(RATE_LIMITS).find((p) => pathname.startsWith(p));
  if (!matchedPath) return _response ?? NextResponse.next();

  const limit = RATE_LIMITS[matchedPath];
  const ip = getClientIp(request);
  const key = `${ip}:${matchedPath}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + limit.windowMs };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  // Set rate limit headers
  const remaining = Math.max(0, limit.max - entry.count);
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit.max));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(entry.resetAt));

  if (entry.count > limit.max) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests", retryAfter: Math.ceil((entry.resetAt - now) / 1000) }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json", 
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(limit.max),
          "X-RateLimit-Remaining": "0",
        } 
      }
    );
  }

  return response;
};
