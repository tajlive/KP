import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleVippsCallback } from "../vipps-callback";

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockDeleteUser = vi.hoisted(() => vi.fn());
const mockGetUserById = vi.hoisted(() => vi.fn());
const mockGenerateLink = vi.hoisted(() => vi.fn());
const mockIdentityMaybeSingle = vi.hoisted(() => vi.fn());
const mockIdentityInsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
        getUserById: mockGetUserById,
        generateLink: mockGenerateLink,
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockIdentityMaybeSingle,
          })),
        })),
      })),
      insert: mockIdentityInsert,
    })),
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
    mockIdentityMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockIdentityInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a server-controlled identity and sanitizes next", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValue({
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

    expect(mockIdentityInsert).toHaveBeenCalledWith({
      provider: "vipps",
      provider_subject: "vipps-sub-123",
      user_id: "user-1",
      provider_email: "test@example.com",
    });
    expect(result.redirectUrl).toContain("next=%2Fno%2Fportfolio");
  });

  it("rejects external next paths", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValue({
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

  it("rejects Vipps userinfo without a provider subject", async () => {
    mockTokenAndUserinfo({ ...baseUserinfo, sub: "" });

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(result.redirectUrl).toContain("error=vipps_userinfo");
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("signs in an existing user from the server-controlled identity", async () => {
    mockIdentityMaybeSingle.mockResolvedValue({
      data: { user_id: "user-1", provider_email: "test@example.com" },
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });
    mockGenerateLink.mockResolvedValue({
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

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockGenerateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "test@example.com",
    });
    expect(result.redirectUrl).toContain("next=%2Fno%2Fdashboard");
  });

  it("requires explicit linking when the email already exists", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(result.redirectUrl).toContain("error=vipps_email_exists");
    expect(mockIdentityInsert).not.toHaveBeenCalled();
  });

  it("rolls back a newly created user when identity insertion conflicts", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });
    mockIdentityInsert.mockResolvedValue({
      error: { message: "duplicate key value" },
    });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockTokenAndUserinfo();

    const result = await handleVippsCallback({
      code: "code",
      state: "state",
      codeVerifier: "verifier",
      locale: "no",
    });

    expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
    expect(result.redirectUrl).toContain("error=vipps_sub_linked_other");
  });
});
