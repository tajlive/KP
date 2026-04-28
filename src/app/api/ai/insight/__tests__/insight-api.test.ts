import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Mock AI providers
vi.mock("@/lib/ai/providers", () => ({
  chatWithAI: vi.fn().mockRejectedValue(new Error("No AI key configured")),
}));

// Mock rate limit (allow all in tests)
vi.mock("@/lib/middleware/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, reset: Date.now() + 60000 }),
}));

import { POST } from "../route";

describe("POST /api/ai/insight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRequest(body: unknown): Request {
    return new Request("http://localhost/api/ai/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function setupAuth(userId: string | null) {
    mockGetUser.mockResolvedValue({
      data: { user: userId ? { id: userId } : null },
      error: userId ? null : new Error("Unauthorized"),
    });
  }

  function setupDb(trades: unknown[] = [], cached: unknown = null) {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          gte: mockGte.mockReturnValue({
            maybeSingle: mockMaybeSingle.mockResolvedValue({ data: cached }),
            order: mockOrder.mockReturnValue({
              maybeSingle: mockMaybeSingle.mockResolvedValue({ data: cached }),
            }),
          }),
          order: mockOrder.mockReturnValue({
            gte: mockGte.mockReturnValue({
              maybeSingle: mockMaybeSingle.mockResolvedValue({ data: cached }),
            }),
          }),
        }),
      }),
      upsert: mockUpsert.mockResolvedValue({ error: null }),
    });

    // Override for trades query
    mockFrom.mockImplementation((table: string) => {
      if (table === "trades") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: trades, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: cached }),
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
  }

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const req = mockRequest({ type: "performance_summary" });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid insight type", async () => {
    setupAuth("user-123");
    setupDb();
    const req = mockRequest({ type: "invalid_type" });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid insight type");
  });

  it("returns rule-based insight when AI is unavailable", async () => {
    setupAuth("user-123");
    setupDb([
      {
        id: "1",
        side: "buy",
        price: 100,
        quantity: 1,
        realized_pnl: 50,
        executed_at: new Date().toISOString(),
        symbol: "BTC",
        trading_pair: "BTC-USDT",
        mode: "paper",
      },
      {
        id: "2",
        side: "sell",
        price: 110,
        quantity: 1,
        realized_pnl: -20,
        executed_at: new Date().toISOString(),
        symbol: "BTC",
        trading_pair: "BTC-USDT",
        mode: "paper",
      },
    ]);

    const req = mockRequest({ type: "performance_summary" });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.insight).toBeDefined();
    expect(body.insight.length).toBeGreaterThan(0);
    expect(body.confidence).toMatch(/high|medium|low/);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.totalTrades).toBe(2);
    expect(body.cached).toBe(false);
    expect(body.generatedAt).toBeDefined();
  });

  it("returns cached insight when available", async () => {
    setupAuth("user-123");
    const cachedResponse = {
      insight: "Cached insight",
      confidence: "high",
      metrics: { totalTrades: 5, winRate: 60 },
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_cache") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { value: cachedResponse } }),
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    });

    const req = mockRequest({ type: "risk_assessment" });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insight).toBe("Cached insight");
    expect(body.cached).toBe(true);
  });
});
