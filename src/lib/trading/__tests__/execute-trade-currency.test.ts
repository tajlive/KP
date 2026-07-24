/**
 * Currency audit trail tests for trade execution
 * Verifies that every trade records the FX rate used at execution time.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// We test the trade insert payload, not the full execution pipeline
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/trading/safety/risk-validator", () => ({
  validateTradeAgainstRiskProfile: vi.fn().mockResolvedValue({ allowed: true }),
  recordTradeRejection: vi.fn().mockResolvedValue(undefined),
  recordTradeDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trading/executor-factory", () => ({
  ExecutorFactory: {
    create: vi.fn().mockResolvedValue({
      executeOrder: vi.fn().mockResolvedValue({
        success: true,
        executedQuantity: 0.1,
        executedPrice: 50000,
        fee: 0.5,
        timestamp: new Date("2026-05-15T10:00:00Z"),
      }),
    }),
    canTradeLive: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: vi.fn().mockResolvedValue(10.92),
  usdtToNok: vi.fn((amount: number, rate?: number) => amount * (rate ?? 10.92)),
}));

vi.mock("@/lib/trading/core/distributed-lock", () => ({
  acquireTradeLock: vi.fn().mockResolvedValue({
    acquired: true,
    release: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/trading/idempotency", () => ({
  makeIdempotencyKey: vi.fn().mockReturnValue("test-idempotency-key"),
  withIdempotency: vi.fn((_db, _key, _scope, _hash, operation) => operation()),
}));

describe("Trade Currency Audit Trail", () => {
  let mockSupabase: Partial<SupabaseClient<Database>>;
  let insertCalls: Array<{ table: string; payload: Record<string, unknown> }>;

  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls = [];

    mockSupabase = {
      from: vi.fn((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn((payload: Record<string, unknown>[] | Record<string, unknown>) => {
            const p = Array.isArray(payload) ? payload[0] : payload;
            insertCalls.push({ table, payload: p });
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "trade-123" },
                  error: null,
                }),
              }),
            };
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "session-123",
              user_id: "user-123",
              current_capital_nok: 100000,
              current_capital: 100000,
              status: "active",
              mode: "paper",
              strategy_config: {},
            },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "session-123",
              user_id: "user-123",
              current_capital_nok: 100000,
              current_capital: 100000,
              status: "active",
              mode: "paper",
              strategy_config: {},
            },
            error: null,
          }),
          rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return chain;
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  it("records usdt_nok_rate in trade insert payload", async () => {
    const { executeTrade } = await import("../core/execute-trade");

    const result = await executeTrade(mockSupabase as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      price: 50000,
      orderType: "market",
      mode: "paper",
      sessionId: "session-123",
    });

    expect(result.success).toBe(true);

    const tradeInsert = insertCalls.find((c) => c.table === "trades");
    expect(tradeInsert).toBeDefined();
    expect(tradeInsert?.payload).toHaveProperty("usdt_nok_rate");
    expect(tradeInsert?.payload.usdt_nok_rate).toBe(10.92);
  });

  it("records a positive, finite rate", async () => {
    const { executeTrade } = await import("../core/execute-trade");

    await executeTrade(mockSupabase as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      price: 50000,
      orderType: "market",
      mode: "paper",
      sessionId: "session-123",
    });

    const tradeInsert = insertCalls.find((c) => c.table === "trades");
    expect(tradeInsert).toBeDefined();

    const rate = tradeInsert?.payload.usdt_nok_rate as number;
    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
    expect(Number.isFinite(rate)).toBe(true);
  });

  it("første handel uten sesjon: auto-oppretter sesjon og tar lås kun én gang", async () => {
    // Regresjon: rekursjonen etter session-auto-create kalte executeTrade på
    // nytt og forsøkte å ta samme trade-lås to ganger → førstehandelen til
    // splitter nye brukere feilet alltid med CONCURRENT_TRADE_BLOCKED.
    const { acquireTradeLock } = await import("../core/distributed-lock");
    const { executeTrade } = await import("../core/execute-trade");

    // Første oppslag (uten sessionId) finner ingen sesjon → auto-create.
    // Deretter slår pipeline opp den nyopprettede sesjonen på id.
    let maybeSingleCalls = 0;
    const sessionRow = {
      id: "session-123",
      user_id: "user-123",
      current_capital_nok: 100000,
      current_capital: 100000,
      status: "active",
      mode: "paper",
      strategy_config: {},
      open_position: null,
    };
    const fromMock = vi.fn((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn(
          (payload: Record<string, unknown>[] | Record<string, unknown>) => {
            const p = Array.isArray(payload) ? payload[0] : payload;
            insertCalls.push({ table, payload: p });
            return {
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { id: "session-123" }, error: null }),
              }),
            };
          },
        ),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() =>
          Promise.resolve(
            maybeSingleCalls++ === 0
              ? { data: null, error: null }
              : { data: sessionRow, error: null },
          ),
        ),
        single: vi.fn().mockResolvedValue({ data: sessionRow, error: null }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    });
    mockSupabase.from =
      fromMock as unknown as SupabaseClient<Database>["from"];

    const result = await executeTrade(mockSupabase as SupabaseClient<Database>, {
      userId: "user-123",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      price: 50000,
      orderType: "market",
      mode: "paper",
      // Merk: ingen sessionId — ny bruker uten sesjon
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(acquireTradeLock)).toHaveBeenCalledTimes(1);
    expect(
      insertCalls.find((c) => c.table === "trading_sessions"),
    ).toBeDefined();
    expect(insertCalls.find((c) => c.table === "trades")).toBeDefined();
  });
});
