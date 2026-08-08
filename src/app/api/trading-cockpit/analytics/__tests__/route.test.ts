import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/auth/live-trading", () => ({
  verifyLiveEntitlement: vi.fn().mockResolvedValue(true),
}));

import { GET } from "../route";

describe("GET /api/trading-cockpit/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRequest(url: string): NextRequest {
    return new Request(url, { method: "GET" }) as unknown as NextRequest;
  }

  function setupAuth(userId: string | null) {
    mockGetUser.mockResolvedValue({
      data: { user: userId ? { id: userId } : null },
      error: userId ? null : new Error("Unauthorized"),
    });
  }

  function setupRpc(analytics: unknown) {
    mockRpc.mockResolvedValue({
      data: [analytics],
      error: null,
    });
  }

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const req = mockRequest(
      "http://localhost/api/trading-cockpit/analytics?mode=paper&dateRange=30d",
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("passes all filter parameters to get_trading_analytics", async () => {
    setupAuth("user-1");
    setupRpc({
      total_trades: 5,
      winning_trades: 3,
      losing_trades: 2,
      win_rate: 60,
      total_pnl: 1000,
      total_fees: 10,
      starting_capital: 10000,
      max_drawdown_pct: -0.05,
      profit_factor: 1.5,
      best_pair: null,
      best_pair_pnl: null,
      worst_pair: null,
      worst_pair_pnl: null,
      best_session_id: null,
      best_session_pnl: null,
      worst_session_id: null,
      worst_session_pnl: null,
      trades_by_day: [],
      trades_by_symbol: [],
    });

    const req = mockRequest(
      "http://localhost/api/trading-cockpit/analytics?mode=paper&dateRange=7d&pair=BTCUSDT&status=filled&sessionStatus=active&side=buy&search=BTC",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("get_trading_analytics", {
      p_user_id: "user-1",
      p_mode: "paper",
      p_trade_statuses: ["filled"],
      p_session_statuses: ["active"],
      p_side: "buy",
      p_pair: "BTCUSDT",
      p_search: "BTC",
      p_from: expect.any(String),
      p_to: expect.any(String),
    });
  });

  it("passes empty values for omitted filters", async () => {
    setupAuth("user-1");
    setupRpc({
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: null,
      total_pnl: 0,
      total_fees: 0,
      starting_capital: 0,
      max_drawdown_pct: null,
      profit_factor: null,
      best_pair: null,
      best_pair_pnl: null,
      worst_pair: null,
      worst_pair_pnl: null,
      best_session_id: null,
      best_session_pnl: null,
      worst_session_id: null,
      worst_session_pnl: null,
      trades_by_day: [],
      trades_by_symbol: [],
    });

    const req = mockRequest(
      "http://localhost/api/trading-cockpit/analytics?mode=paper&dateRange=all",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("get_trading_analytics", {
      p_user_id: "user-1",
      p_mode: "paper",
      p_trade_statuses: null,
      p_session_statuses: null,
      p_side: null,
      p_pair: null,
      p_search: null,
      p_from: null,
      p_to: null,
    });
  });
});
