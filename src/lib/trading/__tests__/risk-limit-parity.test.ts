/**
 * Risk-limit parity test (C5 parity test plan, Task 4).
 *
 * Verifies that the canonical risk engine and both backtest engines resolve
 * and apply the same risk limits, and that the position/exposure percentage
 * calculations agree.
 */

import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkTradeRisk } from "@/lib/trading/canonical/risk/risk-engine";
import {
  resolveRiskLimits,
  type RawRiskProfile,
} from "@/lib/trading/canonical/risk/limits-resolver";
import * as riskLimits from "@/lib/trading/canonical/risk/limits-resolver";
import {
  runBacktest as runLegacyBacktest,
  STRATEGY_CONFIGS,
  type OHLCV as LegacyOHLCV,
} from "@/lib/trading/backtestEngine";
import {
  runBacktest as runNewBacktest,
  type OHLCV as NewOHLCV,
} from "@/lib/backtest/engine";

const { FIXED_RATE } = vi.hoisted(() => ({ FIXED_RATE: 10.92 }));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRate: vi.fn().mockReturnValue(FIXED_RATE),
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(FIXED_RATE),
  };
});

function createMockSupabase(): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table === "positions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
  } as unknown as SupabaseClient;
}

function makeFlatCandles(
  count: number,
  price: number,
  startTime = 1_700_000_000_000,
): LegacyOHLCV[] & NewOHLCV[] {
  const candles: LegacyOHLCV[] & NewOHLCV[] = [];
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

function expectedKonservativRawProfile(): RawRiskProfile {
  return {
    id: "backtest-konservativ",
    name: "Backtest konservativ",
    max_position_pct: 50,
    max_exposure_pct: 50,
    max_daily_loss_pct: 100,
    allowed_pairs: ["ETHUSDT"],
    leverage_allowed: false,
  };
}

describe("risk-limit parity", () => {
  it("both backtest engines resolve the same canonical limits for the same profile", () => {
    const candles = makeFlatCandles(150, 50_000);
    const initialCapital = 100_000;

    const calls: Array<{ mode: string; profile: RawRiskProfile | null | undefined }> =
      [];
    const originalResolveRiskLimits = riskLimits.resolveRiskLimits;

    const spy = vi
      .spyOn(riskLimits, "resolveRiskLimits")
      .mockImplementation((mode, profile) => {
        calls.push({ mode: mode as string, profile });
        return originalResolveRiskLimits(mode, profile);
      });

    try {
      const legacyConfig = STRATEGY_CONFIGS.konservativ;
      runLegacyBacktest(candles, legacyConfig, initialCapital);

      runNewBacktest(candles, "DCA", initialCapital, {
        symbol: legacyConfig.symbol,
        riskProfile: "konservativ",
        smaFast: legacyConfig.smaFast,
        smaSlow: legacyConfig.smaSlow,
        maxPositionPct: legacyConfig.maxPositionPct,
        feeRate: 0.001,
        slippagePct: 0.05,
      });
    } finally {
      spy.mockRestore();
    }

    expect(calls.length).toBe(2);
    expect(calls[0].mode).toBe("paper");
    expect(calls[1].mode).toBe("paper");

    const expectedProfile = expectedKonservativRawProfile();
    expect(calls[0].profile).toEqual(expectedProfile);
    expect(calls[1].profile).toEqual(expectedProfile);

    const expectedLimits = resolveRiskLimits("paper", expectedProfile);
    expect(expectedLimits).toBeDefined();
    expect(calls[0].profile && resolveRiskLimits("paper", calls[0].profile)).toEqual(
      expectedLimits,
    );
    expect(calls[1].profile && resolveRiskLimits("paper", calls[1].profile)).toEqual(
      expectedLimits,
    );
  });

  it("canonical engine and backtest formula compute the same post-trade position pct", async () => {
    const supabase = createMockSupabase();
    const capital = 100_000;
    const price = 50_000;
    const quantity = 1.0;

    const profile: RawRiskProfile = {
      id: "profile-50",
      name: "50% position",
      max_position_pct: 50,
      max_exposure_pct: 50,
      max_daily_loss_pct: 100,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    };

    const result = await checkTradeRisk(
      supabase,
      {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity,
        price,
        orderType: "market",
        tradingMode: "paper",
      },
      {
        id: "session-1",
        user_id: "user-1",
        mode: "paper",
        status: "active",
        current_capital_nok: capital,
        starting_capital_nok: capital,
      },
      profile,
      { convertValue: (v) => v }, // identity: capital already in USDT for parity math
    );

    // Backtest formula: (existingPositionValue + orderValue) / currentEquity * 100
    const orderValue = quantity * price;
    const expectedPostTradePositionPct = (orderValue / capital) * 100;

    expect(result.postTradePositionPct).toBeCloseTo(
      expectedPostTradePositionPct,
      10,
    );
    expect(result.postTradeExposurePct).toBeCloseTo(
      expectedPostTradePositionPct,
      10,
    );
    expect(result.allowed).toBe(true);
  });

  it("canonical engine rejects a position-limit breach that backtest would also skip", async () => {
    const supabase = createMockSupabase();
    const capital = 100_000;
    const price = 50_000;
    const quantity = 1.5; // order value 75k -> 75% of capital, above 50% limit

    const profile: RawRiskProfile = {
      id: "profile-50",
      name: "50% position",
      max_position_pct: 50,
      max_exposure_pct: 50,
      max_daily_loss_pct: 100,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    };

    const result = await checkTradeRisk(
      supabase,
      {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity,
        price,
        orderType: "market",
        tradingMode: "paper",
      },
      {
        id: "session-1",
        user_id: "user-1",
        mode: "paper",
        status: "active",
        current_capital_nok: capital,
        starting_capital_nok: capital,
      },
      profile,
      { convertValue: (v) => v },
    );

    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("POSITION_LIMIT_EXCEEDED");
    expect(result.postTradePositionPct).toBeCloseTo(75, 10);
  });
});
