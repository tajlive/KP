/**
 * Shared test utilities for trading gap analysis modules
 */

import { vi } from "vitest";

export interface MockTrade {
  id?: string;
  trading_pair: string;
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  usdt_nok_rate: number;
  mode: "paper" | "live";
  status: "filled" | "partial" | "cancelled";
  side: "buy" | "sell";
  realized_pnl: number | null;
  executed_at: string;
  created_at: string;
  strategy_signal?: Record<string, unknown> | null;
  // New columns (may not exist in types yet)
  fill_rate?: number;
  latency_ms?: number;
  venue?: string;
  slippage_bps?: number;
  spread_bps?: number;
  post_trade_price_1min?: number;
  post_trade_price_5min?: number;
}

export interface MockBacktestResult {
  id?: string;
  strategy_id?: string;
  symbol: string;
  strategy: string;
  total_return_pct: number;
  total_trades: number;
  created_at: string;
}

function buildMockQuery(data: MockTrade[] | MockBacktestResult[], error: { message: string } | null = null) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((onFulfilled: (v: { data: MockTrade[] | MockBacktestResult[] | null; error: { message: string } | null }) => unknown) =>
      Promise.resolve(onFulfilled({ data: data.length > 0 ? data : null, error })),
    ),
  };
  return chainable;
}

export function createMockSupabase(
  trades: MockTrade[] = [],
  backtests: MockBacktestResult[] = [],
) {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "backtest_results") {
      return buildMockQuery(backtests);
    }
    return buildMockQuery(trades);
  });

  return {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>;
}

export function createErrorSupabase(errorMessage: string) {
  return {
    from: vi.fn().mockReturnValue(buildMockQuery([], { message: errorMessage })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>;
}

export function makeTrade(overrides: Partial<MockTrade> = {}): MockTrade {
  const now = new Date().toISOString();
  return {
    trading_pair: "BTCUSDT",
    quantity: 0.01,
    price: 650000,
    total_value: 6500,
    fee: 6.5,
    usdt_nok_rate: 10.92,
    mode: "paper",
    status: "filled",
    side: "buy",
    realized_pnl: null,
    executed_at: now,
    created_at: now,
    strategy_signal: { regime: "trending", indicators: ["sma_cross"] },
    ...overrides,
  };
}

export function makeSellTrade(pnl: number, overrides: Partial<MockTrade> = {}): MockTrade {
  return makeTrade({
    side: "sell",
    realized_pnl: pnl,
    ...overrides,
  });
}
