/**
 * Tester for middleware auth — fail-closed ved manglende env
 *
 * Krever mocking av Next.js server-runtime + Supabase server client.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// --- Mocks ---

// Mock locale-path BEFORE auth.ts imports it
const mockLocalizedPathname = vi.fn((locale: string, path: string) =>
  path === "/driftsfeil" ? `/${locale}/driftsfeil` : `/${locale}${path}`,
);
vi.mock("./auth-guard", () => ({
  redirectWithCookies: vi.fn(),
  getCookieDomain: vi.fn(() => ".klarpakke.no"),
}));

// Mock onboarding
vi.mock("./onboarding", () => ({
  handleOnboarding: vi.fn(),
}));

// Mock tier-gate
vi.mock("./tier-gate", () => ({
  handleTierGate: vi.fn(),
}));

vi.mock("./locale-path", () => ({
  localizedPathname: mockLocalizedPathname,
  parseLocalePath: (pathname: string) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && ["no", "en", "th", "zh"].includes(segments[0])) {
      return {
        locale: segments[0],
        strippedPath: `/${segments.slice(1).join("/")}`,
      };
    }
    return { locale: "no", strippedPath: pathname };
  },
  isGuestAuthRoute: vi.fn(() => false),
  sanitizePostAuthRedirect: vi.fn((p: string) => p),
}));

// Mock Supabase server
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
}));

// Mock utils
vi.mock("@/lib/admin/impersonation-crypto", () => ({
  decryptImpersonationToken: vi.fn().mockResolvedValue(null),
}));

// Store process.env state for assertions
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authMiddleware fail-closed ved manglende NEXT_PUBLIC_SUPABASE_*", () => {
  it("redirecter /handel (protected) til /no/driftsfeil med 302 og no-cache headers", async () => {
    // Sett opp: fjern env vars
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    // Importer dynamisk etter env-stubbing
    const { authMiddleware } = await import("../auth");

    // Lag en request til /handel (protected path)
    // Vi sender en /no/handel request (locale=no)
    const request = {
      nextUrl: {
        pathname: "/no/handel",
        searchParams: new URLSearchParams(),
      },
      url: "https://example.com/no/handel",
      cookies: { get: vi.fn() },
      headers: new Headers(),
    } as any;

    const response = await authMiddleware(request);

    // Forvent 302 redirect
    expect(response.status).toBe(302);
    // Forvent redirect til /driftsfeil
    expect(response.headers.get("Location")).toMatch(/\/no\/driftsfeil/);
    // Forvent no-cache headers (fail-closed skal ikke caches)
    expect(response.headers.get("Cache-Control")).toMatch(/no-store/);
    expect(response.headers.get("CDN-Cache-Control")).toMatch(/no-store/);

    vi.unstubAllEnvs();
  });

  it("passerer /priser (marketing) uten redirect selv ved manglende env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { authMiddleware } = await import("../auth");

    const request = {
      nextUrl: {
        pathname: "/no/priser",
        searchParams: new URLSearchParams(),
      },
      url: "https://example.com/no/priser",
      cookies: { get: vi.fn() },
      headers: new Headers(),
    } as any;

    const response = await authMiddleware(request);

    // Marketing-sider skal passere — forvent OK status
    expect(response.status).toBe(200);

    vi.unstubAllEnvs();
  });

  it("redirecter /dashboard (protected) til /no/driftsfeil", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { authMiddleware } = await import("../auth");

    const request = {
      nextUrl: {
        pathname: "/no/dashboard",
        searchParams: new URLSearchParams(),
      },
      url: "https://example.com/no/dashboard",
      cookies: { get: vi.fn() },
      headers: new Headers(),
    } as any;

    const response = await authMiddleware(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toMatch(/\/no\/driftsfeil/);

    vi.unstubAllEnvs();
  });

  it("redirecter /admin (protected) til /no/driftsfeil", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { authMiddleware } = await import("../auth");

    const request = {
      nextUrl: {
        pathname: "/no/admin",
        searchParams: new URLSearchParams(),
      },
      url: "https://example.com/no/admin",
      cookies: { get: vi.fn() },
      headers: new Headers(),
    } as any;

    const response = await authMiddleware(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toMatch(/\/no\/driftsfeil/);

    vi.unstubAllEnvs();
  });

  it("bruker rett locale i redirect — /en/handel → /en/driftsfeil", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { authMiddleware } = await import("../auth");

    const request = {
      nextUrl: {
        pathname: "/en/handel",
        searchParams: new URLSearchParams(),
      },
      url: "https://example.com/en/handel",
      cookies: { get: vi.fn() },
      headers: new Headers(),
    } as any;

    const response = await authMiddleware(request);

    expect(response.status).toBe(302);
    // Redirect skal være til /en/driftsfeil (locale=en)
    expect(response.headers.get("Location")).toMatch(/\/en\/driftsfeil/);

    vi.unstubAllEnvs();
  });
});
