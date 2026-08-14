import { describe, it, expect, vi } from "vitest";
import {
  getUserDashboardMetrics,
  DashboardMetricsError,
} from "../getUserDashboardMetrics";
import { CONTAMINATION_CUTOFF } from "@/lib/trading/clean-trades";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Mock getOkxLiveBalance → balanceNok=1050 (100 USDC × 10.5).
// Toppnivå (ikke nøstet i it-blokk): vi.mock hoistes uansett til toppen av
// modulen, og Vitest varsler/feiler på nøstede kall i fremtidige versjoner.
vi.mock("@/lib/trading/okx-live", () => ({
  getOkxLiveBalance: vi.fn().mockResolvedValue({
    connected: true,
    balanceUsdc: 100,
    balanceNok: 1050,
    quoteCcy: "USDC",
    dailyPnl: 0,
    dailyPnlPct: 0,
    position: null,
  }),
}));

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
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
    // Matcher reell RPC-respons (get_dashboard_metrics): total_capital,
    // ingen starting_capital / total_deployed_capital
    total_capital: number | null;
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
  paperAccount?: { current_balance: number } | null;
  sessionError?: { message: string } | null;
  tradeError?: { message: string } | null;
  profileError?: { message: string } | null;
  paperAccountError?: { message: string } | null;
}

function createMockSupabase(opts: MockOpts = {}): SupabaseClient<Database> {
  const {
    rpcResult = null,
    rpcError = null,
    sessions = [],
    trades = [],
    profile = null,
    paperAccount = null,
    sessionError = null,
    tradeError = null,
    profileError = null,
    paperAccountError = null,
  } = opts;

  const mockQueryBuilder = (table: string): MockQueryBuilder => {
    const builder: MockQueryBuilder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      gte: vi.fn(() => builder),
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
  sessionsBuilder.in = vi.fn((column: string, values: string[]) => {
    // Respekter status-filteret (active/paused/stopped) — ellers tester
    // mock-data, ikke koden (P1-B: stopped skal IKKE telle i kapital).
    const filtered =
      column === "status"
        ? sessions.filter((s) => values.includes(s.status))
        : sessions;
    return Promise.resolve({ data: filtered, error: sessionError });
  });

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

  const paperAccountBuilder = mockQueryBuilder("paper_accounts");
  paperAccountBuilder.select = vi.fn(() => paperAccountBuilder);
  paperAccountBuilder.eq = vi.fn(() => paperAccountBuilder);
  paperAccountBuilder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: paperAccount, error: paperAccountError }),
  );

  const from = vi.fn((table: string) => {
    if (table === "trading_sessions") return sessionsBuilder;
    if (table === "trades") return tradesBuilder;
    if (table === "user_profiles") return profileBuilder;
    if (table === "paper_accounts") return paperAccountBuilder;
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
        // Reell RPC returnerer total_capital (ikke total_deployed_capital)
        // og har ingen starting_capital — den blir da 0 uten profil-fallback
        total_capital: 105000,
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
    expect(result.startingCapital).toBe(0);
  });

  it("returns zeroes via RPC when user has no trades", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_capital: 100000,
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
        // Reell RPC returnerer total_capital (ikke total_deployed_capital)
        total_capital: 200000,
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

  it("uses paper_accounts.current_balance before user_profiles.paper_balance", async () => {
    const supabase = createMockSupabase({
      rpcResult: null, // empty array from RPC
      paperAccount: { current_balance: 100_000 },
      profile: { paper_balance: 1 }, // would be wrong if used
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    expect(result.totalCapital).toBe(100_000);
    expect(result.startingCapital).toBe(100_000);
    expect(result.totalTrades).toBe(0);
  });

  // ── TS fallback path ────────────────────────────────────────────────

  it("TS fallback: aggregates trades across sessions, capital ONLY from active", async () => {
    // 2026-08-09 (P0, Tom-rapport): stoppede sesjoners current_capital_nok er
    // fryste historiske verdier og skal IKKE summeres inn i kapital — Tom så
    // 9 492 kr fra en stoppet ADA-sesjon som levende penger. Trades (historikk)
    // telles fortsatt over alle scopete sesjoner.
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
    // Kapital KUN fra aktiv sesjon (110000), IKKE 205000 (aktiv + stoppet)
    expect(result.totalCapital).toBe(110000);
    expect(result.startingCapital).toBe(100000);
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

  // ── P1-A (2026-08-11): RPC-kall sender forurensings-cutoff ──────────

  it("P1-A: RPC-kallet sender CONTAMINATION_CUTOFF som p_cutoff", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 100,
        total_trades: 1,
        winning_trades: 1,
        losing_trades: 0,
        total_capital: 100000,
      },
    });

    await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    const rpcMock = (supabase as unknown as { rpc: ReturnType<typeof vi.fn> })
      .rpc;
    expect(rpcMock).toHaveBeenCalledWith(
      "get_dashboard_metrics",
      expect.objectContaining({ p_cutoff: CONTAMINATION_CUTOFF }),
    );
  });

  it("P1-A: TS-fallback filtrerer trades på cutoff (gte executed_at)", async () => {
    const supabase = createMockSupabase({
      rpcError: { message: "function does not exist" },
      sessions: [
        {
          id: "sess-a",
          current_capital_nok: 100000,
          starting_capital_nok: 100000,
          status: "active",
        },
      ],
      trades: [{ realized_pnl: 5000 }],
    });

    await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    const tradesBuilder = (
      supabase as unknown as {
        from: (t: string) => { gte: ReturnType<typeof vi.fn> };
      }
    ).from("trades");
    // gte ble kalt med CONTAMINATION_CUTOFF på trades-spørringen
    const gteCalls = tradesBuilder.gte.mock.calls.filter(
      (c: unknown[]) => c[0] === "executed_at",
    );
    expect(gteCalls.length).toBeGreaterThan(0);
    expect(gteCalls[0][1]).toBe(CONTAMINATION_CUTOFF);
  });

  // ── P1-B (2026-08-11): fallback-kapital KUN active/paused ───────────

  it("P1-B: getAccountBalance-fallback ekskluderer stoppede sesjoner", async () => {
    // paper_accounts finnes IKKE → fallback-stien kjører; stopped skal
    // ikke telle i kapital (P0-regel: fryst historikk).
    const supabase = createMockSupabase({
      rpcError: { message: "function does not exist" },
      paperAccountError: { message: "no rows" },
      paperAccount: null,
      sessions: [
        {
          id: "sess-active",
          current_capital_nok: 80000,
          starting_capital_nok: 80000,
          status: "active",
        },
        {
          id: "sess-stopped",
          current_capital_nok: 90000,
          starting_capital_nok: 90000,
          status: "stopped",
        },
      ],
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "paper",
    });

    // stopped-sesjonen skal IKKE gi 170000 — kun 80000 fra aktiv
    expect(result.accountBalance).toBe(80000);
  });

  // ── P1-C (2026-08-11): live-kapital henter OKX-saldo, ikke Kraken ──────

  it("P1-C: live-kapital kommer fra getOkxLiveBalance (OKX), ikke Kraken", async () => {
    const supabase = createMockSupabase({
      rpcResult: {
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_capital: 0,
      },
    });

    const result = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: "user-1",
      mode: "live",
    });

    expect(result.accountBalance).toBe(1050); // OKX-balansen, ikke Kraken
  });
});
