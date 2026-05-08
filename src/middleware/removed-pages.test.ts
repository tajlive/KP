import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { removedPagesMiddleware, REMOVED_PAGES } from "./removed-pages";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://www.klarpakke.no${pathname}`));
}

describe("removedPagesMiddleware", () => {
  it("REMOVED_PAGES should be non-empty", () => {
    expect(REMOVED_PAGES.length).toBeGreaterThan(0);
  });

  it("each entry should have required fields", () => {
    for (const page of REMOVED_PAGES) {
      expect(page.from).toBeTruthy();
      expect(page.to).toBeTruthy();
      expect([301, 302]).toContain(page.status);
    }
  });

  it("should redirect /no/dashboard/ai to /no/dashboard (301)", () => {
    const req = makeRequest("/no/dashboard/ai");
    const res = removedPagesMiddleware(req);

    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.klarpakke.no/no/dashboard");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("should redirect /en/dashboard/ai to /en/dashboard (301)", () => {
    const req = makeRequest("/en/dashboard/ai");
    const res = removedPagesMiddleware(req);

    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.klarpakke.no/en/dashboard");
  });

  it("should redirect /dashboard/ai to /no/dashboard (301)", () => {
    const req = makeRequest("/dashboard/ai");
    const res = removedPagesMiddleware(req);

    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.klarpakke.no/no/dashboard");
  });

  it("should pass through alive pages", () => {
    const req = makeRequest("/no/dashboard");
    const res = removedPagesMiddleware(req);

    expect(res.status).toBe(200);
  });

  it("should pass through alive pages under /dashboard/", () => {
    const req = makeRequest("/no/dashboard/trade");
    const res = removedPagesMiddleware(req);

    expect(res.status).toBe(200);
  });
});
