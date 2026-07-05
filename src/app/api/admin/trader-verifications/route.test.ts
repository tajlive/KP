import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.hoisted(() => ({
  value: { id: "admin-user-123", email: "admin@example.com", role: "admin" } as {
    id: string;
    email?: string;
    role?: string;
  },
}));

const getServiceRoleClient = vi.hoisted(() => vi.fn());

const withRole = vi.hoisted(() =>
  vi.fn((roles: string[], handler: (...args: unknown[]) => unknown) => {
    return async (req: NextRequest) => {
      if (!currentUser.value.role || !roles.includes(currentUser.value.role)) {
        return new Response(
          JSON.stringify({ error: "Forbidden. Insufficient permissions." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      return handler(req, { user: currentUser.value });
    };
  }),
);

vi.mock("@/lib/api-auth", () => ({
  withRole,
  getServiceRoleClient,
}));

import { POST, GET } from "./route";

function createMockDb() {
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  };

  const mockDb = {
    from: vi.fn(() => chainMethods),
    rpc: vi.fn(),
  };

  return { mockDb, chainMethods };
}

function buildPostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/trader-verifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildGetRequest(search = "") {
  const url = `http://localhost/api/admin/trader-verifications${search ? `?${search}` : ""}`;
  return new NextRequest(url, { method: "GET" });
}

describe("POST /api/admin/trader-verifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    currentUser.value = { id: "admin-user-123", email: "admin@example.com", role: "admin" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("approves a trader and sets verified=true", async () => {
    const { mockDb, chainMethods } = createMockDb();
    const profile = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: "user-123",
      display_name: "Trader X",
      verified: false,
    };
    const verification = {
      id: "v-123",
      trader_profile_id: "550e8400-e29b-41d4-a716-446655440001",
      status: "approved",
      reason: null,
      verified_by: "admin-user-123",
      created_at: "2024-01-01T00:00:00Z",
    };
    const updatedProfile = { ...profile, verified: true };

    chainMethods.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
    chainMethods.single
      .mockResolvedValueOnce({ data: verification, error: null })
      .mockResolvedValueOnce({ data: updatedProfile, error: null });

    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await POST(buildPostRequest({ trader_profile_id: "550e8400-e29b-41d4-a716-446655440001", status: "approved" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.verification.status).toBe("approved");
    expect(data.profile.verified).toBe(true);
    expect(chainMethods.update).toHaveBeenCalledWith({ verified: true });
  });

  it("rejects a trader and does not update verified", async () => {
    const { mockDb, chainMethods } = createMockDb();
    const profile = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      user_id: "user-456",
      display_name: "Trader Y",
      verified: false,
    };
    const verification = {
      id: "v-456",
      trader_profile_id: "550e8400-e29b-41d4-a716-446655440002",
      status: "rejected",
      reason: "Insufficient documentation",
      verified_by: "admin-user-123",
      created_at: "2024-01-01T00:00:00Z",
    };

    chainMethods.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
    chainMethods.single.mockResolvedValueOnce({ data: verification, error: null });
    chainMethods.update.mockReturnThis();

    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await POST(
      buildPostRequest({
        trader_profile_id: "550e8400-e29b-41d4-a716-446655440002",
        status: "rejected",
        reason: "Insufficient documentation",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.verification.status).toBe("rejected");
    expect(data.profile.verified).toBe(false);
    expect(chainMethods.update).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input body", async () => {
    const { mockDb } = createMockDb();
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await POST(buildPostRequest({ trader_profile_id: "not-a-uuid", status: "unknown" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("returns 404 when trader profile does not exist", async () => {
    const { mockDb, chainMethods } = createMockDb();
    chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null });
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await POST(buildPostRequest({ trader_profile_id: "550e8400-e29b-41d4-a716-446655440003", status: "approved" }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Trader profile not found");
  });

  it("returns 403 for non-admin users", async () => {
    currentUser.value = { id: "user-000", email: "user@example.com", role: "user" };
    const { mockDb } = createMockDb();
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await POST(buildPostRequest({ trader_profile_id: "550e8400-e29b-41d4-a716-446655440004", status: "approved" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden. Insufficient permissions.");
  });
});

describe("GET /api/admin/trader-verifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    currentUser.value = { id: "admin-user-123", email: "admin@example.com", role: "admin" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a list of verifications and count", async () => {
    const { mockDb, chainMethods } = createMockDb();
    const verifications = [
      {
        id: "v-1",
        trader_profile_id: "tp-1",
        status: "approved",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    chainMethods.range.mockResolvedValue({ data: verifications, error: null, count: 1 });
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await GET(buildGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.verifications).toEqual(verifications);
    expect(data.count).toBe(1);
  });

  it("supports status filter", async () => {
    const { mockDb, chainMethods } = createMockDb();
    chainMethods.range.mockResolvedValue({ data: [], error: null, count: 0 });
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await GET(buildGetRequest("status=pending"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.verifications).toEqual([]);
    expect(data.count).toBe(0);
    expect(chainMethods.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("requires admin role", async () => {
    currentUser.value = { id: "user-000", email: "user@example.com", role: "user" };
    const { mockDb } = createMockDb();
    getServiceRoleClient.mockReturnValue(mockDb);

    const res = await GET(buildGetRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden. Insufficient permissions.");
  });
});
