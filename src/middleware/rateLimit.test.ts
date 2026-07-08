import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "./rateLimit";

describe("rateLimitMiddleware", () => {
  it("skips non-API routes", async () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);
    expect(out.status).toBe(200);
  });

  it("adds rate limit headers when under limit", async () => {
    const req = new NextRequest(new URL("http://localhost/api/trading"), {
      headers: { "cf-connecting-ip": "10.0.0.1" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(200);
    expect(out.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(Number(out.headers.get("X-RateLimit-Remaining"))).toBeGreaterThan(0);
  });

  it("returns 429 when rate limit exceeded", async () => {
    // Exhaust the rate limit by sending max+1 requests
    const ip = "10.0.0.2";
    const maxRequests = 60; // /api/trading limit
    const res = NextResponse.next();

    // Send max requests (should all succeed)
    for (let i = 0; i < maxRequests; i++) {
      const req = new NextRequest(new URL(`http://localhost/api/trading?r${i}=${i}`), {
        headers: { "cf-connecting-ip": ip },
      });
      const out = await rateLimitMiddleware(req, NextResponse.next());
      expect(out.status).toBe(200);
    }

    // 61st request should be rate limited
    const req = new NextRequest(new URL("http://localhost/api/trading?r=over"), {
      headers: { "cf-connecting-ip": ip },
    });
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(429);
    expect(out.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
