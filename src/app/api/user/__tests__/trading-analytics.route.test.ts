import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getCleanTrades: vi.fn(),
  buildTradingAnalytics: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mocks.getUser },
  })),
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/trading/clean-trades", () => ({
  getCleanTrades: mocks.getCleanTrades,
  clampedRealizedPnl: vi.fn(() => new Map()),
}));

vi.mock("@/lib/trading/build-trading-analytics", () => ({
  buildTradingAnalytics: mocks.buildTradingAnalytics,
}));

vi.mock("@/lib/trading/risk-ai-explanations", () => ({
  generateRiskExplanations: vi.fn().mockResolvedValue(null),
}));

import { GET } from "../trading-analytics/route";

const analytics = {
  generatedAt: "2026-08-11T00:00:00.000Z",
  tradeCount: 1,
  aggregates: {
    rowCount: 1,
    winCount: 0,
    lossCount: 0,
    breakevenCount: 0,
    noRealizedPnlCount: 1,
    totalRealizedPnl: 0,
    totalEffectivePnl: 0,
    effectiveWinCount: 0,
    effectiveLossCount: 0,
    effectiveBreakevenCount: 0,
    winRateRealizedPct: null,
  },
  cumulativePnl: [],
  dailyPnl: [],
  modeSplit: [],
  topPairs: [],
  winLossSlices: [],
  bestDay: null,
  worstDay: null,
  riskMetrics: {
    sortinoRatio: 0,
    calmarRatio: 0,
    var95: 0,
    var99: 0,
    expectedShortfall95: 0,
    omegaRatio: 0,
    maxConsecutiveLosses: 0,
    avgTimeToRecovery: 0,
    gainPainRatio: 0,
  },
};

describe("GET /api/user/trading-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.getCleanTrades.mockResolvedValue([
      {
        id: "trade-in-archived-session",
        trading_pair: "BTCUSDT",
        side: "buy",
        realized_pnl: null,
        mode: "paper",
        created_at: "2026-08-10T00:00:00.000Z",
        executed_at: "2026-08-10T00:00:00.000Z",
        total_value: 100,
      },
    ]);
    mocks.buildTradingAnalytics.mockReturnValue(analytics);
  });

  it("includes trades from archived sessions in the results ledger", async () => {
    const request = new Request(
      "http://localhost/api/user/trading-analytics",
    ) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, tradeCount: 1 });
    // undefined means all user sessions. Passing an ID list here is what
    // previously excluded archived sessions and produced "0 handler".
    expect(mocks.getCleanTrades).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      undefined,
      { limit: 4000 },
    );
  });
});
