import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET } from "../trade-decisions/route";

describe("GET /api/user/trade-decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRequest(url: string): NextRequest {
    const req = new Request(url, { method: "GET" });
    const reqUrl = new URL(url);
    Object.defineProperty(req, "nextUrl", {
      value: reqUrl,
      writable: false,
    });
    return req as unknown as NextRequest;
  }

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    });
    const req = mockRequest("http://localhost/api/user/trade-decisions?limit=10");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 200 with decisions when authenticated", async () => {
    const userId = "u1";
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    const decisions = [
      {
        id: "d1",
        decision_type: "allow",
        trading_mode: "paper",
        symbol: "BTCUSDT",
        side: "buy",
        requested_quantity: 0.1,
        requested_price: 60000,
        rejection_reason: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    // Build the correct mock chain:
    // from("trade_decisions").select(...).eq("user_id", id).order(...).limit(n)
    const mockLimit = vi.fn().mockResolvedValue({
      data: decisions,
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ select: mockSelect });

    const req = mockRequest("http://localhost/api/user/trade-decisions?limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.decisions).toHaveLength(1);
    expect(body.decisions[0].id).toBe("d1");
    // Verify the query chain was built correctly
    expect(mockFrom).toHaveBeenCalledWith("trade_decisions");
    expect(mockEq).toHaveBeenCalledWith("user_id", userId);
  });
});
