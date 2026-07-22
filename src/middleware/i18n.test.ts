import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { i18nMiddleware } from "./i18n";

vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return {
    default: vi.fn(() => () => NextResponse.next()),
  };
});

describe("i18nMiddleware", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.clearAllMocks();
  });

  it("redirects /settings to /profile?tab=settings", async () => {
    const req = new NextRequest(new URL("http://localhost/settings"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/profile?tab=settings");
  });

  it("redirects /innlogging to /login", async () => {
    const req = new NextRequest(new URL("http://localhost/innlogging"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/login");
  });

  it("redirects /beta to /dashboard", async () => {
    const req = new NextRequest(new URL("http://localhost/beta"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/dashboard");
  });

  it("redirects /beta/live-trading to /handel?mode=live", async () => {
    const req = new NextRequest(new URL("http://localhost/beta/live-trading"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/handel?mode=live");
  });

  it("redirects root with ?code= to canonical /callback", async () => {
    const req = new NextRequest(new URL("http://localhost/?code=abc"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/no/callback?code=abc",
    );
  });

  it("redirects /no/no/priser to /no/priser (duplicate locale)", async () => {
    const req = new NextRequest(new URL("http://localhost/no/no/priser"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/priser");
  });

  it("redirects /en/en/dashboard to /en/dashboard (duplicate locale)", async () => {
    const req = new NextRequest(new URL("http://localhost/en/en/dashboard"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/en/dashboard");
  });

  it("redirects /dashboard/autopilot to canonical /dashboard/auto-trade", async () => {
    const req = new NextRequest(new URL("http://localhost/no/dashboard/autopilot"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/dashboard/auto-trade");
  });

  it("redirects /bots to canonical /dashboard/auto-trade", async () => {
    const req = new NextRequest(new URL("http://localhost/no/bots"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/dashboard/auto-trade");
  });

  it("redirects /dashboard/trade to canonical /trade", async () => {
    const req = new NextRequest(new URL("http://localhost/no/dashboard/trade"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/trade");
  });
});
