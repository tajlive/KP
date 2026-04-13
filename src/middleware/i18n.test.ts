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

  it("redirects /settings to /innstillinger", async () => {
    const req = new NextRequest(new URL("http://localhost/settings"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/innstillinger");
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

  it("redirects /beta/live-trading to /paper-trading?mode=live", async () => {
    const req = new NextRequest(new URL("http://localhost/beta/live-trading"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/no/paper-trading?mode=live");
  });

  it("redirects root with ?code= to /auth/callback", async () => {
    const req = new NextRequest(new URL("http://localhost/?code=abc"));
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost/no/auth/callback?code=abc");
  });

  it("redirects vercel.app to canonical domain", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.klarpakke.no";
    const req = new NextRequest("http://klarpakke.vercel.app/some-path", {
      headers: { host: "klarpakke.vercel.app" },
    });
    const res = await i18nMiddleware(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://www.klarpakke.no/some-path");
  });
});
