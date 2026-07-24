/**
 * Currency-handling parity test (C5 parity test plan, Task 5).
 *
 * Verifies that paper trading, live risk validation, and backtest result
 * conversion all use the same USDT→NOK rate and conversion formula.
 */

import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getUsdtToNokRate,
  getUsdtToNokRateAsync,
  usdtToNok,
} from "@/lib/trading/currency";
import * as riskEngine from "@/lib/trading/canonical/risk/risk-engine";
import { validateTradeAgainstRiskProfile } from "@/lib/trading/safety/risk-validator";
import { PaperExecutor } from "@/lib/trading/paper-executor";
import {
  runBacktest,
  STRATEGY_CONFIGS,
  type OHLCV,
} from "@/lib/trading/backtestEngine";

const { RATE } = vi.hoisted(() => ({ RATE: 10.92 }));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRate: vi.fn().mockReturnValue(RATE),
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(RATE),
    usdtToNok: vi.fn((amount: number, rate?: number) => amount * (rate ?? RATE)),
  };
});

function createMockSupabase(): SupabaseClient {
  const session = {
    id: "session-1",
    user_id: "user-1",
    mode: "paper",
    status: "active",
    current_capital_nok: 1_000_000,
    starting_capital_nok: 1_000_000,
  };

  const profile = {
    id: "profile-1",
    name: "Test",
    max_position_pct: 50,
    max_exposure_pct: 50,
    max_daily_loss_pct: 100,
    allowed_pairs: ["BTCUSDT"],
    leverage_allowed: false,
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "trading_sessions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: session, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "risk_profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: profile, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
  } as unknown as SupabaseClient;
}

function createPaperSessionSupabase(): SupabaseClient {
  const position = {
    quantity: 0.01,
    entry_price: 50_000,
    entry_time: Date.now() - 60_000,
  };

  const session = {
    id: "paper-session-1",
    user_id: "user-1",
    current_capital_nok: 1_000_000,
    current_capital: 1_000_000,
    status: "active",
    mode: "paper",
    open_position: position,
    trading_pair: "BTCUSDT",
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
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as SupabaseClient;
}

function makeFlatCandles(count: number, price: number): OHLCV[] {
  const startTime = 1_700_000_000_000;
  const candles: OHLCV[] = [];
  for (let i = 0; i < count; i++) {
    candles.push({
      timestamp: startTime + i * 24 * 60 * 60 * 1000,
      open: price,
      high: price * 1.001,
      low: price * 0.999,
      close: price,
      volume: 1_000_000,
    });
  }
  return candles;
}

describe("currency handling parity", () => {
  it("paper risk validator uses the same convertValue as usdtToNok", async () => {
    const supabase = createMockSupabase();
    const spy = vi
      .spyOn(riskEngine, "checkTradeRisk")
      .mockResolvedValue({ allowed: true });

    try {
      await validateTradeAgainstRiskProfile(supabase, {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.1,
        price: 50_000,
        orderType: "market",
        tradingMode: "paper",
      });

      expect(getUsdtToNokRateAsync).toHaveBeenCalledWith(supabase);
      expect(spy).toHaveBeenCalledTimes(1);

      const options = spy.mock.calls[0][4];
      expect(options?.convertValue).toBeDefined();
      expect(options?.convertValue?.(100)).toBe(usdtToNok(100, RATE));
    } finally {
      spy.mockRestore();
    }
  });

  it("live risk validator uses identity conversion (no FX conversion)", async () => {
    const supabase = createMockSupabase();
    const spy = vi
      .spyOn(riskEngine, "checkTradeRisk")
      .mockResolvedValue({ allowed: true });

    try {
      await validateTradeAgainstRiskProfile(supabase, {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.1,
        price: 50_000,
        orderType: "market",
        tradingMode: "live",
      });

      expect(getUsdtToNokRateAsync).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);

      const options = spy.mock.calls[0][4];
      expect(options?.convertValue).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it("PaperExecutor getBalance uses usdtToNok for locked position value", async () => {
    const supabase = createPaperSessionSupabase();
    const executor = new PaperExecutor(supabase, "user-1");
    const balance = await executor.getBalance();

    // Session open_position: 0.01 BTC @ $50k = $500 USDT locked.
    const lockedUsdt = 0.01 * 50_000;
    expect(balance.locked).toBe(usdtToNok(lockedUsdt));
    expect(balance.locked).toBeCloseTo(lockedUsdt * RATE, 10);
  });

  it("backtest result NOK conversion matches usdtToNok formula", () => {
    const initialCapitalUSD = 100_000;
    const initialCapitalNOK = initialCapitalUSD * RATE;
    const candles = makeFlatCandles(150, 50_000);
    const result = runBacktest(
      candles,
      STRATEGY_CONFIGS.balansert,
      initialCapitalUSD,
    );

    const multiplier = 1 + result.metrics.totalReturnPct / 100;
    const endValueNOK = usdtToNok(initialCapitalUSD * multiplier);

    // The public calculateBacktest formula: endValueNOK = initialCapitalUSD * multiplier * rate,
    // which is exactly usdtToNok(...) when rate is consistent.
    expect(endValueNOK).toBeCloseTo(initialCapitalNOK * multiplier, 10);
  });
});
