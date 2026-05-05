import { describe, it, expect, vi } from "vitest";
import { getUserBalance, getDisplayBalance } from "../balance";
import type { UserBalance } from "../balance";

function createMockSupabase(session: unknown, profile: unknown, wallet: unknown, portfolio: unknown) {
  return {
    from: vi.fn((table: string) => {
      const data =
        table === "trading_sessions"
          ? session
          : table === "user_profiles"
            ? profile
            : table === "wallets"
              ? wallet
              : portfolio;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
        single: vi.fn().mockResolvedValue({ data, error: null }),
      };
    }),
  } as unknown as Parameters<typeof getUserBalance>[0];
}

describe("getUserBalance", () => {
  it("returns null when no active session", async () => {
    const supabase = createMockSupabase(null, null, null, null);
    const result = await getUserBalance(supabase, "user-1");
    expect(result).toBeNull();
  });

  it("returns balance with synced sources", async () => {
    const supabase = createMockSupabase(
      {
        current_capital_nok: 95000,
        starting_capital_nok: 100000,
        total_pnl: -5000,
        total_trades: 10,
        strategy_id: "dca",
      },
      { paper_balance: 95000 },
      { balance: 95000 },
      { current_balance: 95000 }
    );

    const result = await getUserBalance(supabase, "user-1");
    expect(result).not.toBeNull();
    expect(result!.sessionCapitalNok).toBe(95000);
    expect(result!.sessionStartingNok).toBe(100000);
    expect(result!.sessionPnl).toBe(-5000);
    expect(result!.sessionTrades).toBe(10);
    expect(result!.sessionStrategyId).toBe("dca");
    expect(result!.isSynced).toBe(true);
  });

  it("detects drift when sources differ", async () => {
    const supabase = createMockSupabase(
      {
        current_capital_nok: 95000,
        starting_capital_nok: 100000,
        total_pnl: -5000,
        total_trades: 5,
        strategy_id: null,
      },
      { paper_balance: 100000 }, // drift
      { balance: 95000 },
      { current_balance: 95000 }
    );

    const result = await getUserBalance(supabase, "user-1");
    expect(result).not.toBeNull();
    expect(result!.isSynced).toBe(false);
  });

  it("handles missing wallet and portfolio gracefully", async () => {
    const supabase = createMockSupabase(
      {
        current_capital_nok: 100000,
        starting_capital_nok: 100000,
        total_pnl: 0,
        total_trades: 0,
        strategy_id: "trend",
      },
      { paper_balance: 100000 },
      null,
      null
    );

    const result = await getUserBalance(supabase, "user-1");
    expect(result).not.toBeNull();
    expect(result!.walletBalance).toBe(0);
    expect(result!.portfolioBalance).toBe(0);
    expect(result!.isSynced).toBe(true);
  });

  it("handles zero balances as synced", async () => {
    const supabase = createMockSupabase(
      {
        current_capital_nok: 0,
        starting_capital_nok: 100000,
        total_pnl: -100000,
        total_trades: 99,
        strategy_id: "grid",
      },
      { paper_balance: 0 },
      { balance: 0 },
      { current_balance: 0 }
    );

    const result = await getUserBalance(supabase, "user-1");
    expect(result).not.toBeNull();
    expect(result!.isSynced).toBe(true);
  });
});

describe("getDisplayBalance", () => {
  it("returns default capital when balance is null", () => {
    expect(getDisplayBalance(null)).toBe(100000);
  });

  it("returns session capital when balance exists", () => {
    const balance: UserBalance = {
      sessionCapitalNok: 87500,
      sessionStartingNok: 100000,
      sessionPnl: -12500,
      sessionTrades: 20,
      sessionStrategyId: "multi",
      profilePaperBalance: 87500,
      walletBalance: 87500,
      portfolioBalance: 87500,
      isSynced: true,
    };
    expect(getDisplayBalance(balance)).toBe(87500);
  });
});
