import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "./rateLimit";

const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static fixedWindow = vi.fn(() => "fixedWindow");
    constructor() {}
    limit = mockLimit;
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor() {}
  },
}));

describe("rateLimitMiddleware", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockLimit.mockReset();
  });

  it("skips non-API routes", async () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);
    expect(out.status).toBe(200);
  });

  it("skips when Upstash env is missing", async () => {
    const req = new NextRequest(new URL("http://localhost/api/test"));
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);
    expect(out.status).toBe(200);
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    mockLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: 1234567890,
    });

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(429);
    expect(out.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(out.headers.get("x-middleware-stop")).toBe("true");
  });

  it("adds rate limit headers when under limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    mockLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: 1234567890,
    });

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(200);
    expect(out.headers.get("X-RateLimit-Remaining")).toBe("99");
  });
});
