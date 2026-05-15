import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

let mockSupabase: any;

describe("Balance Drift Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    };
  });

  it("returns 401 without CRON_SECRET", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/cron/balance-drift-check");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns empty when no active paper sessions", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/cron/balance-drift-check", {
      headers: { authorization: "Bearer test-secret" },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.checked).toBe(0);
  });

  it("detects drift when balances diverge", async () => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: "s1", user_id: "u1", current_capital_nok: 100000, current_capital: 100000 },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "user_profiles") {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "u1", paper_balance: 95000 }],
                error: null,
              }),
            })),
          };
        }
        if (table === "wallets") {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        if (table === "portfolios") {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
      }),
    };

    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/cron/balance-drift-check", {
      headers: { authorization: "Bearer test-secret" },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.driftCount).toBe(1);
    expect(json.drifts).toHaveLength(1);
    expect(json.drifts[0].maxDriftPct).toBeCloseTo(0.05, 2);
  });
});
