import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleVippsCallback } from "../vipps-callback";

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockGenerateLink = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        generateLink: mockGenerateLink,
        listUsers: mockListUsers,
      },
    },
  })),
}));

const baseUserinfo = {
  sub: "vipps-sub-123",
  name: "Test User",
  email: "test@example.com",
  email_verified: true,
  phone_number: "+4799999999",
};

function mockTokenAndUserinfo(userinfo = baseUserinfo) {
  vi.stubGlobal("fetch", vi.fn());
  const mockedFetch = vi.mocked(fetch);
  mockedFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ access_token: "access_123", id_token: "id_123" }),
      { status: 200 },
    ),
  );
  mockedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(userinfo), { status: 200 }),
  );
}

describe("handleVippsCallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.VIPPS_CLIENT_ID = "client-id";
    process.env.VIPPS_CLIENT_SECRET = "client-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses sanitizePostAuthRedirect for the next path", async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: { action_link: "http://localhost/no/callback" } },
      error: null,
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
      next: "/no/portfolio",
    });

    expect(result.redirectUrl).toContain("next=%2Fno%2Fportfolio");
  });

  it("rejects external next paths", async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: { action_link: "http://localhost/no/callback" } },
      error: null,
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
      next: "https://evil.com/redirect",
    });

    expect(result.redirectUrl).toContain("next=%2Fno%2Fdashboard");
  });

  it("rejects unverified Vipps email", async () => {
    mockTokenAndUserinfo({ ...baseUserinfo, email_verified: false });

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(result.redirectUrl).toContain("error=vipps_email_not_verified");
  });

  it("signs in an existing user linked by vipps_sub", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          {
            id: "user-1",
            email: "test@example.com",
            user_metadata: { vipps_sub: "vipps-sub-123" },
          },
        ],
      },
      error: null,
    });
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: { action_link: "http://localhost/no/callback" } },
      error: null,
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(mockGenerateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "test@example.com",
    });
    expect(result.redirectUrl).toContain("next=%2Fno%2Fdashboard");
  });

  it("requires explicit linking when email exists but vipps_sub is not linked", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          {
            id: "user-1",
            email: "test@example.com",
            user_metadata: {},
          },
        ],
      },
      error: null,
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(result.redirectUrl).toContain("error=vipps_email_exists");
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("rejects when vipps_sub is linked to a different user than the email", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          {
            id: "user-vipps",
            email: "other@example.com",
            user_metadata: { vipps_sub: "vipps-sub-123" },
          },
          {
            id: "user-email",
            email: "test@example.com",
            user_metadata: {},
          },
        ],
      },
      error: null,
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(result.redirectUrl).toContain("error=vipps_sub_linked_other");
  });

  it("creates a new user and uses magic-link bridge with deprecation warning", async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValueOnce({
      data: { properties: { action_link: "http://localhost/no/callback" } },
      error: null,
    });
    mockTokenAndUserinfo();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        user_metadata: expect.objectContaining({ vipps_sub: "vipps-sub-123" }),
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Magic-link bridge used for new Vipps user"),
    );
    expect(result.redirectUrl).toContain("next=%2Fno%2Fdashboard");

    warnSpy.mockRestore();
  });
});
