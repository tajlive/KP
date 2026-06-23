import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { cacheControlMiddleware } from "./cache-control";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://www.klarpakke.no${pathname}`));
}

describe("cacheControlMiddleware", () => {
  it("sets no-store for auth routes", () => {
    for (const path of ["/no/login", "/en/register", "/no/reset-password", "/en/callback"]) {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
      expect(res.headers.get("CDN-Cache-Control")).toContain("no-store");
    }
  });

  it("sets no-store for dashboard and admin", () => {
    for (const path of ["/no/dashboard", "/en/dashboard/trade", "/no/admin"]) {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("sets edge-cache headers for marketing pages", () => {
    for (const path of ["/no", "/en/priser", "/no/om-oss", "/en/kontakt"]) {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      const cc = res.headers.get("Cache-Control");
      expect(cc).toContain("s-maxage=300");
      expect(cc).toContain("stale-while-revalidate=86400");
      expect(cc).toContain("public");
    }
  });

  it("sets edge-cache headers for legal pages", () => {
    for (const path of ["/no/personvern", "/en/vilkar", "/no/cookies"]) {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      const cc = res.headers.get("Cache-Control");
      expect(cc).toContain("s-maxage=300");
      expect(cc).toContain("stale-while-revalidate=86400");
      expect(cc).toContain("public");
    }
  });

  it("does NOT override API routes", () => {
    const req = makeRequest("/api/health");
    const existing = NextResponse.next();
    existing.headers.set("Cache-Control", "public, max-age=60");

    const res = cacheControlMiddleware(req, existing);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("preserves existing response headers", () => {
    const req = makeRequest("/no/login");
    const existing = NextResponse.next();
    existing.headers.set("x-existing", "1");

    const res = cacheControlMiddleware(req, existing);
    expect(res.headers.get("x-existing")).toBe("1");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
