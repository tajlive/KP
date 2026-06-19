import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { cspMiddleware } from "./csp";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://www.klarpakke.no${pathname}`));
}

describe("cspMiddleware", () => {
  it("sets Content-Security-Policy on HTML responses", () => {
    const req = makeRequest("/no");
    const res = cspMiddleware(req);

    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });

  it("does NOT set global Cache-Control no-store", () => {
    const req = makeRequest("/no");
    const res = cspMiddleware(req);

    expect(res.headers.get("Cache-Control")).toBeNull();
    expect(res.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
    expect(res.headers.get("CDN-Cache-Control")).toBeNull();
  });

  it("passes through an existing response and preserves CSP header", () => {
    const req = makeRequest("/no");
    const existing = NextResponse.next();
    existing.headers.set("x-existing", "1");

    const res = cspMiddleware(req, existing);

    expect(res.headers.get("x-existing")).toBe("1");
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });
});
