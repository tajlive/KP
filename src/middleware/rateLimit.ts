import { NextRequest, NextResponse } from "next/server";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";

let ratelimit: ReturnType<typeof createFixedWindowLimiter> | null = null;

function createFixedWindowLimiter(windowSeconds: number, maxRequests: number) {
  return {
    async limit(identifier: string) {
      const redis = getRedisRest();
      if (!redis) {
        // No Redis/KV available — allow the request
        return { success: true, limit: maxRequests, remaining: maxRequests, reset: Date.now() + windowSeconds * 1000 };
      }

      const key = `ratelimit:${identifier}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      const results = await pipeline.exec<[number, number]>();
      const count = results[0] ?? 1;
      const reset = Math.floor((Math.floor(Date.now() / 1000 / windowSeconds) + 1) * windowSeconds);

      return {
        success: count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count),
        reset,
      };
    },
  };
}

function getRateLimit() {
  if (ratelimit) return ratelimit;

  if (!isRedisRestConfigured()) {
    return null;
  }

  ratelimit = createFixedWindowLimiter(60, 100);
  return ratelimit;
}

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

export async function rateLimitMiddleware(
  request: NextRequest,
  response?: NextResponse,
): Promise<NextResponse> {
  response = response ?? NextResponse.next();
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return response;
  }

  const limiter = getRateLimit();
  if (!limiter) {
    // Redis/KV not configured — skip rate limiting (common in local dev)
    return response;
  }

  const ip = getIp(request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    const res = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-RateLimit-Reset", String(reset));
    res.headers.set("x-middleware-stop", "true");
    return res;
  }

  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(reset));

  return response;
}
