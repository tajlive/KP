/**
 * Idempotency behavior tests for unified trade execution.
 * Verifies that executeTrade delegates to withIdempotency correctly and
 * propagates idempotency states (completed, pending, collision).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  withIdempotency,
  makeIdempotencyKey,
} from "@/lib/trading/idempotency";
import { ExecutorFactory } from "@/lib/trading/executor-factory";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/trading/idempotency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/idempotency")>();
  return {
    ...actual,
    withIdempotency: vi.fn(),
    makeIdempotencyKey: vi.fn((parts: (string | number | null | undefined)[]) =>
      parts.map(String).join("|"),
    ),
  };
});

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

const mockSupabase = () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
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

  // Override the trades insert chain so it returns a persisted trade when
  // the idempotency wrapper executes the operation.
  chain.insert = vi.fn((payload: unknown) => {
    return {
      ...chain,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "trade-123", ...(payload as Record<string, unknown>) },
          error: null,
        }),
      }),
    };
  });

  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as SupabaseClient<Database>;
};

describe("executeTrade idempotency", () => {
  let supabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = mockSupabase();
  });

  const baseRequest = {
    userId: "user-123",
    sessionId: "session-123",
    symbol: "BTCUSDT",
    side: "buy" as const,
    quantity: 0.1,
    price: 50000,
    orderType: "market" as const,
    mode: "paper" as const,
  };

  it("returns a stored completed response without executing the trade", async () => {
    const { executeTrade } = await import("../execute-trade");
    const storedResult = {
      success: true,
      tradeId: "stored-trade-456",
      orderId: "order-789",
      executedPrice: 49999,
      executedQuantity: 0.1,
      fee: 0.5,
    };

    vi.mocked(withIdempotency).mockResolvedValue(storedResult);

    const result = await executeTrade(supabase, baseRequest);

    expect(result).toEqual(storedResult);
    expect(ExecutorFactory.create).not.toHaveBeenCalled();
    expect(withIdempotency).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      "trade",
      expect.any(String),
      expect.any(Function),
    );
  });

  it("propagates a pending idempotency error", async () => {
    const { executeTrade } = await import("../execute-trade");

    vi.mocked(withIdempotency).mockRejectedValue(
      new Error("Idempotency key trade/key-1 is pending"),
    );

    const result = await executeTrade(supabase, baseRequest);

    expect(result.success).toBe(false);
    expect(result.error).toContain("pending");
  });

  it("propagates an idempotency collision error", async () => {
    const { executeTrade } = await import("../execute-trade");

    vi.mocked(withIdempotency).mockRejectedValue(
      new Error("Idempotency key collision: trade/key-1"),
    );

    const result = await executeTrade(supabase, {
      ...baseRequest,
      idempotencyKey: "key-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("collision");
  });

  it("executes the operation and returns the trade result when idempotency allows", async () => {
    const { executeTrade } = await import("../execute-trade");

    vi.mocked(withIdempotency).mockImplementation(
      async (_db, _key, _scope, _hash, operation) => operation(),
    );

    const result = await executeTrade(supabase, baseRequest);

    expect(result.success).toBe(true);
    expect(result.tradeId).toBe("trade-123");
    expect(ExecutorFactory.create).toHaveBeenCalledWith(
      supabase,
      baseRequest.userId,
      baseRequest.mode,
      baseRequest.sessionId,
    );
  });

  it("passes a request hash that excludes the caller-provided idempotency key", async () => {
    const { executeTrade } = await import("../execute-trade");

    vi.mocked(withIdempotency).mockImplementation(
      async (_db, _key, _scope, _hash, operation) => operation(),
    );

    await executeTrade(supabase, {
      ...baseRequest,
      idempotencyKey: "caller-key-1",
    });

    const requestHash = vi.mocked(makeIdempotencyKey).mock.results.find(
      (r) =>
        r.value &&
        typeof r.value === "string" &&
        r.value.includes(baseRequest.sessionId) &&
        r.value.includes(String(baseRequest.quantity)),
    )?.value;

    expect(requestHash).toBeDefined();
    expect(requestHash).not.toContain("caller-key-1");

    expect(withIdempotency).toHaveBeenCalledWith(
      expect.anything(),
      "caller-key-1",
      "trade",
      requestHash,
      expect.any(Function),
    );
  });
});
