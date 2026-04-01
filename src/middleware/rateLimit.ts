import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRateLimit() {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(100, "1 m"),
    analytics: true,
  });

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
    // Upstash not configured — skip rate limiting (common in local dev)
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
