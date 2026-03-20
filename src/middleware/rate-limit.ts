import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function handleRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (isRedisRestConfigured()) {
    const redis = getRedisRest();
    if (!redis) return NextResponse.next();

    try {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded
        ? forwarded.split(",")[0]
        : request.headers.get("x-real-ip") || "127.0.0.1";
      const ratelimitKey = `ratelimit:${ip}`;
      const limit = 60;
      const windowSec = 60;

      const currentCount = await redis.incr(ratelimitKey);
      if (currentCount === 1) await redis.expire(ratelimitKey, windowSec);

      if (currentCount > limit) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": windowSec.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        });
      }
    } catch (error) {
      console.error("[RateLimit] Redis REST error:", error);
    }
  }

  return NextResponse.next();
}
