import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { cacheControlMiddleware } from "./cache-control";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://www.klarpakke.no${pathname}`));
}

describe("cacheControlMiddleware", () => {
  it.each([
    "/no/login",
    "/en/register",
    "/no/reset-password",
    "/en/callback",
  ])("sets no-store for auth route %s", (path) => {
    const req = makeRequest(path);
    const res = cacheControlMiddleware(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("CDN-Cache-Control")).toContain("no-store");
  });

  it.each([
    "/no/dashboard",
    "/en/dashboard/trade",
    "/no/admin",
    "/no/marked",
  ])("sets no-store for dashboard/admin route %s", (path) => {
    const req = makeRequest(path);
    const res = cacheControlMiddleware(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it.each([
    "/no",
    "/en",
  ])("sets no-store for landing page %s", (path) => {
    const req = makeRequest(path);
    const res = cacheControlMiddleware(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("CDN-Cache-Control")).toContain("no-store");
  });

  it.each([
    "/en/priser",
    "/no/om-oss",
    "/en/kontakt",
  ])("sets edge-cache headers for marketing page %s", (path) => {
    const req = makeRequest(path);
    const res = cacheControlMiddleware(req);
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("s-maxage=300");
    expect(cc).toContain("stale-while-revalidate=86400");
    expect(cc).toContain("public");
  });

  it.each([
    "/no/personvern",
    "/en/vilkar",
    "/no/cookies",
  ])("sets edge-cache headers for legal page %s", (path) => {
    const req = makeRequest(path);
    const res = cacheControlMiddleware(req);
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("s-maxage=300");
    expect(cc).toContain("stale-while-revalidate=86400");
    expect(cc).toContain("public");
  });

  it.each(["/no/login", "/en/register"])(
    "keeps no-store for auth page %s even when removed from marketing paths",
    (path) => {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
      expect(res.headers.get("CDN-Cache-Control")).toContain("no-store");
    },
  );

  it.each(["/no/hjelp", "/en/kurs"])(
    "does not override Cache-Control for non-marketing, non-auth route %s",
    (path) => {
      const req = makeRequest(path);
      const res = cacheControlMiddleware(req);
      expect(res.headers.get("Cache-Control")).toBeNull();
      expect(res.headers.get("CDN-Cache-Control")).toBeNull();
    },
  );

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
