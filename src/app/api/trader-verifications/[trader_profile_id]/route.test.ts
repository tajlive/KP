import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.hoisted(() => ({
  value: { id: "user-123", email: "user@example.com", role: "trader" } as {
    id: string;
    email?: string;
    role?: string;
  },
}));

const createClient = vi.hoisted(() => vi.fn());

const withAuth = vi.hoisted(() =>
  vi.fn((handler: (...args: unknown[]) => unknown) => {
    return async (req: NextRequest) => handler(req, { user: currentUser.value });
  }),
);

vi.mock("@/lib/api-auth", () => ({
  withAuth,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

import { GET } from "./route";

function buildRequest(path: string) {
  return new NextRequest(`http://localhost/api/trader-verifications/${path}`);
}

function createMockDb(result: unknown[] | null, error: Error | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: result, error }),
  };
}

describe("GET /api/trader-verifications/[trader_profile_id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    currentUser.value = { id: "user-123", email: "user@example.com", role: "trader" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the latest verification for a valid UUID", async () => {
    const verification = {
      status: "approved",
      reason: "All checks passed",
      verified_by: "admin-123",
      created_at: "2024-01-01T00:00:00Z",
    };
    createClient.mockReturnValue(createMockDb([verification]));

    const res = await GET(buildRequest("550e8400-e29b-41d4-a716-446655440000"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("approved");
    expect(data.reason).toBe("All checks passed");
    expect(data.verified_by).toBe("admin-123");
    expect(data.created_at).toBe("2024-01-01T00:00:00Z");
  });

  it("returns 404 when no verification exists", async () => {
    createClient.mockReturnValue(createMockDb([]));

    const res = await GET(buildRequest("550e8400-e29b-41d4-a716-446655440000"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("No verification found");
  });

  it("returns 400 for an invalid UUID", async () => {
    createClient.mockReturnValue(createMockDb(null));

    const res = await GET(buildRequest("not-a-uuid"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid trader_profile_id");
  });
});
