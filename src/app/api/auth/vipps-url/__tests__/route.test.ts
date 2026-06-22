import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockShouldShowVippsForRequest = vi.hoisted(() => vi.fn(() => true));
const mockRedisSet = vi.hoisted(() => vi.fn());
const mockGetRedisRest = vi.hoisted(() => vi.fn(() => ({ set: mockRedisSet })));

vi.mock("@/lib/geo/vipps-region", () => ({
  shouldShowVippsForRequest: mockShouldShowVippsForRequest,
}));

vi.mock("@/lib/redis-client", () => ({
  getRedisRest: mockGetRedisRest,
}));

describe("GET /api/auth/vipps-url", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockShouldShowVippsForRequest.mockReturnValue(true);
    process.env.VIPPS_CLIENT_ID = "client-id";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function buildRequest(search = "", ip = "1.2.3.4") {
    return new NextRequest(
      `http://localhost/api/auth/vipps-url${search}`,
      {
        headers: { "x-forwarded-for": ip },
      },
    );
  }

  it("returns a Vipps auth URL with PKCE and S256 parameters", async () => {
    const res = await GET(buildRequest("?locale=no"));
    const body = await res.json();

    const authUrl = new URL(body.url);
    expect(authUrl.origin).toBe("https://api.vipps.no");
    expect(authUrl.searchParams.get("redirect_uri")).toBe(
      "https://www.klarpakke.no/api/auth/vipps-callback",
    );
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authUrl.searchParams.get("code_challenge")).toMatch(
      /^[A-Za-z0-9_-]+$/,
    );
    expect(authUrl.searchParams.get("state")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("sets __Host-prefixed PKCE and state cookies", async () => {
    const res = await GET(buildRequest("?locale=no"));

    const pkce = res.cookies.get("__Host-vipps-pkce");
    const state = res.cookies.get("__Host-vipps-state");

    expect(pkce?.value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pkce?.httpOnly).toBe(true);
    expect(pkce?.secure).toBe(true);
    expect(pkce?.sameSite).toBe("lax");
    expect(pkce?.path).toBe("/");

    expect(state?.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("stores sanitized next path in KV keyed by state", async () => {
    const res = await GET(buildRequest("?locale=no&next=/no/portfolio"));
    const state = res.cookies.get("__Host-vipps-state")?.value;

    expect(mockRedisSet).toHaveBeenCalledWith(
      `vipps:state:${state}`,
      { locale: "no", next: "/no/portfolio" },
      { ex: 600 },
    );
  });

  it("rejects external next paths from KV storage", async () => {
    const res = await GET(buildRequest("?locale=no&next=https://evil.com"));
    const state = res.cookies.get("__Host-vipps-state")?.value;

    expect(mockRedisSet).toHaveBeenCalledWith(
      `vipps:state:${state}`,
      { locale: "no", next: "/" },
      { ex: 600 },
    );
  });

  it("returns 403 when Vipps is not available for the region", async () => {
    mockShouldShowVippsForRequest.mockReturnValue(false);
    const res = await GET(buildRequest("?locale=no"));
    expect(res.status).toBe(403);
  });

  it("returns 500 when VIPPS_CLIENT_ID is missing", async () => {
    delete process.env.VIPPS_CLIENT_ID;
    const res = await GET(buildRequest("?locale=no", "9.9.9.9"));
    expect(res.status).toBe(500);
  });
});
