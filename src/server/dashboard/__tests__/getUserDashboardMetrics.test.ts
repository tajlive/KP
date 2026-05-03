import { describe, it, expect, vi } from "vitest";
import {
  getUserDashboardMetrics,
  DashboardMetricsError,
} from "../getUserDashboardMetrics";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

interface MockOpts {
  rpcResult?: {
    total_pnl: number | null;
    total_trades: number | null;
    winning_trades: number | null;
    losing_trades: number | null;
    total_deployed_capital: number | null;
    starting_capital: number | null;
  } | null;
  rpcError?: { message: string } | null;
  sessions?: Array<{
    id: string;
    current_capital_nok: number | null;
    starting_capital_nok: number | null;
    status: string;
  }>;
  trades?: Array<{ realized_pnl: number | null }>;
  profile?: { paper_balance: number } | null;
  sessionError?: { message: string } | null;
  tradeError?: { message: string } | null;
  profileError?: { message: string } | null;
}

function createMockSupabase(opts: MockOpts = {}): SupabaseClient<Database> {
  const {
    rpcResult = null,
    rpcError = null,
    sessions = [],
    trades = [],
    profile = null,
    sessionError = null,
    tradeError = null,
    profileError = null,
  } = opts;

  const mockQueryBuilder = (table: string): MockQueryBuilder => {
    const builder: MockQueryBuilder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: table === "user_profiles" ? profile : null,
          error: profileError,
        }),
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: table === "user_profiles" ? profile : null,
          error: profileError,
        }),
      ),
    };
    return builder;
  };

  const sessionsBuilder = mockQueryBuilder("trading_sessions");
  sessionsBuilder.select = vi.fn(() => sessionsBuilder);
  sessionsBuilder.eq = vi.fn(() => sessionsBuilder);
  sessionsBuilder.is = vi.fn(() => sessionsBuilder);
  sessionsBuilder.in = vi.fn(() =>
    Promise.resolve({ data: sessions, error: sessionError }),
  );

  const tradesBuilder = mockQueryBuilder("trades");
  tradesBuilder.select = vi.fn(() => tradesBuilder);
  tradesBuilder.eq = vi.fn(() => tradesBuilder);
  tradesBuilder.in = vi.fn(() => tradesBuilder);
  tradesBuilder.not = vi.fn(() =>
    Promise.resolve({ data: trades, error: tradeError }),
  );

  const profileBuilder = mockQueryBuilder("user_profiles");
  profileBuilder.select = vi.fn(() => profileBuilder);
  profileBuilder.eq = vi.fn(() => profileBuilder);
  profileBuilder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: profile, error: profileError }),
  );

  const from = vi.fn((table: string) => {
    if (table === "trading_sessions") return sessionsBuilder;
    if (table === "trades") return tradesBuilder;
    if (table === "user_profiles") return profileBuilder;
    return mockQueryBuilder(table);
  });

  const rpc = vi.fn(() => {
    if (rpcError) {
      return Promise.resolve({ data: null, error: rpcError });
    }
    if (rpcResult) {
      return Promise.resolve({ data: [rpcResult], error: null });
    }
    return Promise.resolve({ data: [], error: null });
  });

  return { from, rpc } as unknown as SupabaseClient<Database>;
}

describe("getUserDashboardMetrics", () => {
  // ── RPC path (default) ──────────────────────────────────────────────

  it("returns RPC metrics for a user with winning and losing trades", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 1300,
        total_trades: 4,
        winning_trades: 2,
        losing_trades: 1,
        total_deployed_capital: 105000,
        starting_capital: 100000,
      },
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
      sessionScope: "active_and_completed",
    });

    expect(result.totalTrades).toBe(4);
    expect(result.totalPnl).toBe(1300);
    expect(result.winningTrades).toBe(2);
    expect(result.losingTrades).toBe(1);
    expect(result.winRate).toBeCloseTo(2 / 3, 2);
    expect(result.totalCapital).toBe(105000);
    expect(result.startingCapital).toBe(100000);
  });

  it("returns zeroes via RPC when user has no trades", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_deployed_capital: 100000,
        starting_capital: 100000,
      },
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    expect(result.totalTrades).toBe(0);
    expect(result.totalPnl).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.winningTrades).toBe(0);
    expect(result.losingTrades).toBe(0);
  });

  it("filters by mode=live via RPC", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 50000,
        total_trades: 1,
        winning_trades: 1,
        losing_trades: 0,
        total_deployed_capital: 200000,
        starting_capital: 150000,
      },
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "live",
    });

    expect(result.totalCapital).toBe(200000);
    expect(result.totalPnl).toBe(50000);
  });

  it("falls back to TS aggregation when RPC fails", async () => {
    const supabase = createMockSupabase({
      rpcError: { message: "function does not exist" },
      sessions: [
        {
          id: "sess-1",
          current_capital_nok: 105000,
          starting_capital_nok: 100000,
          status: "active",
        },
      ],
      trades: [
        { realized_pnl: 1000 },
        { realized_pnl: 500 },
        { realized_pnl: -200 },
      ],
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    expect(result.totalTrades).toBe(3);
    expect(result.totalPnl).toBe(1300);
    expect(result.totalCapital).toBe(105000);
  });

  it("falls back to paper_balance when RPC returns empty and no sessions", async () => {
    const supabase = createMockSupabase({
      rpcResult: null, // empty array from RPC
      profile: { paper_balance: 75000 },
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    expect(result.totalCapital).toBe(75000);
    expect(result.startingCapital).toBe(100000);
    expect(result.totalTrades).toBe(0);
  });

  // ── TS fallback path ────────────────────────────────────────────────

  it("TS fallback: aggregates trades across multiple sessions", async () => {
    const supabase = createMockSupabase({
      rpcError: { message: "function does not exist" },
      sessions: [
        {
          id: "sess-a",
          current_capital_nok: 110000,
          starting_capital_nok: 100000,
          status: "active",
        },
        {
          id: "sess-b",
          current_capital_nok: 95000,
          starting_capital_nok: 100000,
          status: "stopped",
        },
      ],
      trades: [
        { realized_pnl: 5000 },
        { realized_pnl: 5000 },
        { realized_pnl: -5000 },
      ],
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    expect(result.totalTrades).toBe(3);
    expect(result.totalPnl).toBe(5000);
    expect(result.totalCapital).toBe(205000); // sum across sessions
  });

  it("TS fallback: throws DashboardMetricsError when sessions query fails", async () => {
    const supabase = createMockSupabase({
      rpcError: { message: "function does not exist" },
      sessionError: { message: "connection lost" },
    });

    await expect(
      getUserDashboardMetrics({
        supabaseClient: supabase,
        userId: "user-1",
        mode: "paper",
      }),
    ).rejects.toBeInstanceOf(DashboardMetricsError);
  });
});
