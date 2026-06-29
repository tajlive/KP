import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "./rateLimit";

const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  pexpire: vi.fn(),
  pipeline: vi.fn(() => mockPipeline),
};

vi.mock("@/lib/redis-client", () => ({
  getRedisRest: vi.fn(() => mockRedis),
  isRedisRestConfigured: vi.fn(() => true),
}));

describe("rateLimitMiddleware", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { isRedisRestConfigured } = await import("@/lib/redis-client");
    vi.mocked(isRedisRestConfigured).mockReturnValue(true);
    mockPipeline.incr.mockReturnThis();
    mockPipeline.expire.mockReturnThis();
  });

  it("skips non-API routes", async () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);
    expect(out.status).toBe(200);
    expect(mockRedis.pipeline).not.toHaveBeenCalled();
  });

  it("skips when Redis/KV is not configured", async () => {
    const { isRedisRestConfigured } = await import("@/lib/redis-client");
    vi.mocked(isRedisRestConfigured).mockReturnValue(false);

    const req = new NextRequest(new URL("http://localhost/api/test"));
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);
    expect(out.status).toBe(200);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockPipeline.exec.mockResolvedValue([101, 1]);

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
    mockPipeline.exec.mockResolvedValue([50, 1]);

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(200);
    expect(out.headers.get("X-RateLimit-Remaining")).toBe("50");
  });

  it("returns 503 when Redis/KV backend fails by default", async () => {
    mockPipeline.exec.mockRejectedValue(new Error("redis unavailable"));
    delete process.env.RATE_LIMIT_FAIL_OPEN;

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(503);
    expect(out.headers.get("Retry-After")).toBe("10");
    expect(out.headers.get("x-middleware-stop")).toBe("true");
  });

  it("allows API requests when Redis/KV backend fails and RATE_LIMIT_FAIL_OPEN is set", async () => {
    mockPipeline.exec.mockRejectedValue(new Error("redis unavailable"));
    process.env.RATE_LIMIT_FAIL_OPEN = "true";

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = NextResponse.next();
    const out = await rateLimitMiddleware(req, res);

    expect(out.status).toBe(200);
    expect(out.headers.get("X-RateLimit-Remaining")).toBeNull();

    delete process.env.RATE_LIMIT_FAIL_OPEN;
  });
});
