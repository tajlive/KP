import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function handleRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const isKVEnabled =
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (isKVEnabled) {
    try {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded
        ? forwarded.split(",")[0]
        : request.headers.get("x-real-ip") || "127.0.0.1";
      const ratelimitKey = `ratelimit:${ip}`;
      const limit = 60;
      const window = 60;

      const currentCount = await kv.incr(ratelimitKey);
      if (currentCount === 1) await kv.expire(ratelimitKey, window);

      if (currentCount > limit) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": window.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        });
      }
    } catch (error) {
      console.error("[RateLimit] KV Error:", error);
    }
  }

  return NextResponse.next();
}
