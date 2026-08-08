/**
 * Tick-route paper/live parity test (C5 parity test plan, Task 6).
 *
 * Verifies that the order dispatched by the paper branch (via executeTrade)
 * and the live branch (via executeLiveTrade) use identical core order
 * parameters: symbol, side, quantity and orderType.
 */

import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import {
  executeLiveTrade,
  minOrderValueForMode,
} from "@/app/api/cron/tick/route";

const { RATE } = vi.hoisted(() => ({ RATE: 10.92 }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/trading/idempotency", () => ({
  makeIdempotencyKey: vi.fn().mockReturnValue("key"),
  withIdempotency: vi.fn((_db, _key, _scope, _hash, operation) => operation()),
}));

vi.mock("@/lib/trading/safety/risk-validator", () => ({
  validateTradeAgainstRiskProfile: vi.fn().mockResolvedValue({ allowed: true }),
  recordTradeRejection: vi.fn().mockResolvedValue(undefined),
  recordTradeDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRate: vi.fn().mockReturnValue(RATE),
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(RATE),
    usdtToNok: vi.fn((amount: number, rate?: number) => amount * (rate ?? RATE)),
  };
});

vi.mock("@/lib/trading/core/distributed-lock", () => ({
  acquireTradeLock: vi.fn().mockResolvedValue({
    acquired: true,
    release: vi.fn().mockResolvedValue(undefined),
  }),
}));

function createMockExecutor() {
  return {
    executeOrder: vi.fn().mockResolvedValue({
      success: true,
      orderId: "order-1",
      executedPrice: 50_025,
      executedQuantity: 0.1,
      fee: 0.5,
      timestamp: new Date(),
    }),
    getBalance: vi.fn().mockResolvedValue({ available: 1_000_000 }),
    getPosition: vi.fn().mockResolvedValue(null),
    validateApiKeys: vi.fn().mockResolvedValue(true),
    getMarketPrice: vi.fn().mockResolvedValue(50_000),
    fetchOrderBook: vi.fn().mockResolvedValue({ bids: [], asks: [], timestamp: new Date() }),
  };
}

vi.mock("@/lib/trading/executor-factory", () => {
  const mockExecutor = createMockExecutor();
  return {
    ExecutorFactory: {
      create: vi.fn().mockResolvedValue(mockExecutor),
      canTradeLive: vi.fn().mockResolvedValue(true),
      createFromSession: vi.fn(),
    },
    __mockExecutor: mockExecutor,
  };
});

function createMockSupabase(capital: number): SupabaseClient {
  const session = {
    id: "session-1",
    user_id: "user-1",
    current_capital_nok: capital,
    current_capital: capital,
    status: "active",
    mode: "paper",
    strategy_config: {},
    open_position: null,
  };

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
    single: vi.fn().mockResolvedValue({ data: session, error: null }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "trades") {
        return {
          ...chain,
          single: vi.fn().mockResolvedValue({
            data: { id: "trade-1" },
            error: null,
          }),
        };
      }
      if (table === "idempotency_keys") {
        return {
          ...chain,
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return chain;
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as SupabaseClient;
}

describe("tick route paper/live parity", () => {
  it("paper executeTrade and live executeLiveTrade receive identical core order params", async () => {
    const supabase = createMockSupabase(1_000_000);

    const paperResult = await executeTrade(supabase as unknown as Parameters<typeof executeTrade>[0], {
      userId: "user-1",
      sessionId: "session-1",
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      price: 50_000,
      orderType: "market",
      mode: "paper",
    });

    const liveResult = await executeLiveTrade(
      supabase as unknown as Parameters<typeof executeLiveTrade>[0],
      "user-1",
      "BTC/USDT",
      "buy",
      0.1,
    );

    expect(paperResult.success).toBe(true);
    expect(liveResult.ok).toBe(true);

    const { ExecutorFactory } = await import("@/lib/trading/executor-factory");
    const createCalls = (ExecutorFactory.create as ReturnType<typeof vi.fn>).mock.calls;
    const paperCreateCall = createCalls.find((c) => c[2] === "paper");
    const liveCreateCall = createCalls.find((c) => c[2] === "live");
    expect(paperCreateCall).toBeDefined();
    expect(liveCreateCall).toBeDefined();

    const factoryModule = await import("@/lib/trading/executor-factory");
    const mockExecutor = (
      factoryModule as unknown as {
        __mockExecutor: ReturnType<typeof createMockExecutor>;
      }
    ).__mockExecutor;
    const orderCalls = mockExecutor.executeOrder.mock.calls as Array<
      [Record<string, unknown>]
    >;

    expect(orderCalls.length).toBe(2);

    const paperOrder = orderCalls[0][0];
    const liveOrder = orderCalls[1][0];

    expect(paperOrder.symbol).toBe("BTCUSDT");
    expect(liveOrder.symbol).toBe("BTCUSDT");

    expect(paperOrder.side).toBe("buy");
    expect(liveOrder.side).toBe("buy");

    expect(paperOrder.quantity).toBe(0.1);
    expect(liveOrder.quantity).toBe(0.1);

    expect(paperOrder.orderType).toBe("market");
    expect(liveOrder.orderType).toBe("market");
  });

  it("minOrderValueForMode: live-terskel er 10 USDT (ikke 100 NOK) — live-fiks 2026-08-01", () => {
    // Paper-kapital er NOK: 100 NOK ≈ 10 USDT
    expect(minOrderValueForMode("paper")).toBe(100);
    expect(minOrderValueForMode(null)).toBe(100);
    // Live-kapital er USDT: minimumsordre er $10; 75 USDT-ordre
    // ble feilaktig holdt med NOK-terskelen (regresjon bevist i prod)
    expect(minOrderValueForMode("live")).toBe(10);
    expect(minOrderValueForMode("live") < 100).toBe(true);
  });
});
