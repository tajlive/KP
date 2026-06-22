/**
 * Tester for kanonisk risk-engine.
 *
 * Verifiserer at valideringslogikken er identisk for test og live og at
 * modusspesifikke forskjeller kun kommer fra limits-resolver.
 */

import { describe, it, expect, vi } from "vitest";
import { checkTradeRisk } from "@/lib/trading/canonical/risk/risk-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(overrides: {
  positions?: Array<{ symbol: string; quantity: number; avg_entry_price: number }>;
  dailyLoss?: number | null;
  dailyLossError?: { message: string } | null;
  botHealth?: {
    status: string;
    last_heartbeat?: string;
    consecutive_errors?: number;
    max_consecutive_errors?: number;
  } | null;
} = {}): SupabaseClient {
  const {
    positions = [],
    dailyLoss = 0,
    dailyLossError = null,
    botHealth = null,
  } = overrides;

  const buildChain = (result: unknown) => ({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }),
      single: vi.fn().mockResolvedValue(result),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }),
        single: vi.fn().mockResolvedValue(result),
      }),
      single: vi.fn().mockResolvedValue(result),
    }),
  });

  const from = vi.fn((table: string) => {
    if (table === "positions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: positions, error: null }),
        }),
      };
    }
    if (table === "bot_health") {
      return buildChain({ data: botHealth, error: null });
    }
    return buildChain({ data: null, error: null });
  });

  return {
    from,
    rpc: vi.fn().mockResolvedValue({ data: dailyLoss, error: dailyLossError }),
  } as unknown as SupabaseClient;
}

const baseSession = {
  id: "session-1",
  user_id: "user-1",
  mode: "paper" as const,
  status: "active",
  current_capital_nok: 1_000_000,
  starting_capital_nok: 1_000_000,
};

const baseTrade = {
  userId: "user-1",
  sessionId: "session-1",
  symbol: "BTCUSDT",
  side: "buy" as const,
  quantity: 0.1,
  price: 500_000,
  orderType: "market" as const,
  tradingMode: "paper" as const,
};

describe("canonical risk-engine", () => {
  it("allows a small paper buy within demo limits", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(supabase, baseTrade, baseSession, null);
    expect(result.allowed).toBe(true);
    expect(result.limits?.profileName).toBe("paper-demo");
  });

  it("rejects when session is not active", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(
      supabase,
      baseTrade,
      { ...baseSession, status: "paused" },
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("SESSION_NOT_ACTIVE");
  });

  it("rejects when trading mode does not match session", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, tradingMode: "live" },
      baseSession,
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("INVALID_TRADING_MODE");
  });

  it("rejects live without risk profile", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, tradingMode: "live" },
      { ...baseSession, mode: "live" },
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("NO_RISK_PROFILE");
  });

  it("rejects disallowed pair", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, symbol: "UNKNOWN" },
      baseSession,
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("PAIR_NOT_ALLOWED");
  });

  it("rejects buy exceeding balance when position limit allows it", async () => {
    const supabase = createMockSupabase();
    const profile = {
      id: "profile-high",
      name: "High limits",
      max_position_pct: 200,
      max_exposure_pct: 200,
      max_daily_loss_pct: 100,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    };
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, quantity: 3 }, // 3 * 500k = 1.5M > 1M capital
      baseSession,
      profile,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("INSUFFICIENT_BALANCE");
  });

  it("rejects position exceeding max position pct", async () => {
    const supabase = createMockSupabase();
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, quantity: 10 }, // 10 * 500k = 5M = 500% of capital
      baseSession,
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("POSITION_LIMIT_EXCEEDED");
  });

  it("rejects when daily loss limit is exceeded", async () => {
    const supabase = createMockSupabase({ dailyLoss: 25_000 });
    const profile = {
      id: "profile-low-loss",
      name: "Low loss limit",
      max_position_pct: 100,
      max_exposure_pct: 100,
      max_daily_loss_pct: 2, // 2% of 1M = 20k; 25k > 20k -> reject
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    };
    const result = await checkTradeRisk(supabase, baseTrade, baseSession, profile);
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("DAILY_LOSS_LIMIT_EXCEEDED");
  });

  it("rejects when daily loss RPC fails", async () => {
    const supabase = createMockSupabase({
      dailyLossError: { message: "rpc error" },
    });
    const result = await checkTradeRisk(supabase, baseTrade, baseSession, null);
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("DAILY_LOSS_CHECK_FAILED");
  });

  it("rejects when bot is unhealthy", async () => {
    const supabase = createMockSupabase({
      botHealth: {
        status: "stopped",
        last_heartbeat: new Date().toISOString(),
        consecutive_errors: 0,
        max_consecutive_errors: 3,
      },
    });
    const result = await checkTradeRisk(
      supabase,
      { ...baseTrade, botId: "bot-1" },
      baseSession,
      null,
    );
    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("BOT_NOT_HEALTHY");
  });

  it("uses provided currency converter for paper capital", async () => {
    const supabase = createMockSupabase();
    // 0.1 BTC @ $50k = $5k. With converter 1 USDT = 11 NOK -> 55k NOK.
    // Capital is 1M NOK, so well within limits.
    const result = await checkTradeRisk(supabase, baseTrade, baseSession, null, {
      convertValue: (usdt) => usdt * 11,
    });
    expect(result.allowed).toBe(true);
  });

  it("computes identical pre/post percentages for live and paper with same limits", async () => {
    const profile = {
      id: "profile-1",
      name: "Test",
      max_position_pct: 10,
      max_exposure_pct: 20,
      max_daily_loss_pct: 2,
      allowed_pairs: ["BTCUSDT"],
      leverage_allowed: false,
    };

    const paperSupabase = createMockSupabase();
    const liveSupabase = createMockSupabase();

    const paperResult = await checkTradeRisk(
      paperSupabase,
      { ...baseTrade, tradingMode: "paper" },
      baseSession,
      profile,
    );
    const liveResult = await checkTradeRisk(
      liveSupabase,
      { ...baseTrade, tradingMode: "live" },
      { ...baseSession, mode: "live" },
      profile,
    );

    expect(paperResult.allowed).toBe(liveResult.allowed);
    expect(paperResult.preTradePositionPct).toBe(liveResult.preTradePositionPct);
    expect(paperResult.postTradePositionPct).toBe(liveResult.postTradePositionPct);
    expect(paperResult.preTradeExposurePct).toBe(liveResult.preTradeExposurePct);
    expect(paperResult.postTradeExposurePct).toBe(liveResult.postTradeExposurePct);
  });
});
