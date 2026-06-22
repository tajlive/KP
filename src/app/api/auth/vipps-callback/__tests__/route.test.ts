import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockHandleVippsCallback = vi.hoisted(() => vi.fn());
const mockRedisGet = vi.hoisted(() => vi.fn());
const mockRedisSet = vi.hoisted(() => vi.fn());
const mockRedisDel = vi.hoisted(() => vi.fn());
const mockGetRedisRest = vi.hoisted(() =>
  vi.fn(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  })),
);

vi.mock("@/lib/auth/vipps-callback", () => ({
  handleVippsCallback: mockHandleVippsCallback,
}));

vi.mock("@/lib/redis-client", () => ({
  getRedisRest: mockGetRedisRest,
}));

describe("GET /api/auth/vipps-callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHandleVippsCallback.mockResolvedValue({
      redirectUrl: "http://localhost/no/callback?next=%2Fno%2Fdashboard",
    });
    mockRedisGet.mockResolvedValue({ locale: "no", next: "/no/dashboard" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function buildRequest({
    code = "auth-code",
    state = "state-123",
    cookies = {},
  }: {
    code?: string;
    state?: string;
    cookies?: Record<string, string>;
  } = {}) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    return new NextRequest(
      `http://localhost/api/auth/vipps-callback?code=${code}&state=${state}`,
      {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      },
    );
  }

  it("calls handleVippsCallback and deletes cookies on success", async () => {
    const req = buildRequest({
      cookies: {
        "__Host-vipps-pkce": "verifier",
        "__Host-vipps-state": "state-123",
      },
    });

    const res = await GET(req);

    expect(mockHandleVippsCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "auth-code",
        state: "state-123",
        codeVerifier: "verifier",
        locale: "no",
        next: "/no/dashboard",
      }),
    );
    expect(mockRedisDel).toHaveBeenCalledWith("vipps:state:state-123");
    expect(res.cookies.get("__Host-vipps-pkce")?.value).toBe("");
    expect(res.cookies.get("__Host-vipps-state")?.value).toBe("");
    expect(res.status).toBe(302);
  });

  it("rejects mismatched state in constant time", async () => {
    const req = buildRequest({
      state: "attacker-state",
      cookies: {
        "__Host-vipps-pkce": "verifier",
        "__Host-vipps-state": "real-state",
      },
    });

    const res = await GET(req);

    expect(mockHandleVippsCallback).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("error=invalid_state");
  });

  it("rejects missing cookies", async () => {
    const req = buildRequest();

    const res = await GET(req);

    expect(mockHandleVippsCallback).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("error=invalid_state");
  });

  it("rejects missing code or state", async () => {
    const req = new NextRequest("http://localhost/api/auth/vipps-callback", {
      headers: {
        cookie: "__Host-vipps-pkce=verifier; __Host-vipps-state=state-123",
      },
    });

    const res = await GET(req);

    expect(mockHandleVippsCallback).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("error=vipps_missing_params");
  });

  it("falls back to default locale when KV is unavailable", async () => {
    mockGetRedisRest.mockReturnValueOnce(null);
    const req = buildRequest({
      cookies: {
        "__Host-vipps-pkce": "verifier",
        "__Host-vipps-state": "state-123",
      },
    });

    const res = await GET(req);

    expect(mockHandleVippsCallback).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "no" }),
    );
    expect(res.status).toBe(302);
  });
});
