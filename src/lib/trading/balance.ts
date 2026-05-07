/**
 * Balance Source of Truth — Unified balance fetcher
 *
 * ADR: docs/adr/ADR-2026-04-24-BALANCE-SOURCE-OF-TRUTH.md
 *
 * Rule: trading_sessions.current_capital_nok is the canonical balance.
 *       user_profiles.paper_balance, wallets.balance, and portfolios.current_balance
 *       are kept in sync via trigger_update_session_state.
 *
 * Use these helpers instead of ad-hoc Supabase queries to ensure all pages
 * read the same number.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface UserBalance {
  /** Canonical balance from trading_sessions (NOK) */
  sessionCapitalNok: number;
  /** Starting capital for the active session (NOK) */
  sessionStartingNok: number;
  /** Session P&L (NOK) */
  sessionPnl: number;
  /** Number of trades in the active session */
  sessionTrades: number;
  /** Strategy ID for the active session */
  sessionStrategyId: string | null;
  /** Mirrored value from user_profiles.paper_balance */
  profilePaperBalance: number;
  /** Mirrored value from wallets.balance */
  walletBalance: number;
  /** Mirrored value from portfolios.current_balance */
  portfolioBalance: number;
  /** true if all four sources are within 1 NOK of each other */
  isSynced: boolean;
}

/**
 * Fetch the unified balance for a user.
 * Reads from trading_sessions (source of truth) AND the mirrored tables
 * so callers can detect drift if the trigger ever fails.
 */
export async function getUserBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserBalance | null> {
  const [
    { data: session, error: sessionErr },
    { data: profile, error: profileErr },
    { data: wallet, error: walletErr },
    { data: portfolio, error: portfolioErr },
  ] = await Promise.all([
    supabase
      .from("trading_sessions")
      .select("current_capital_nok, starting_capital_nok, total_pnl, total_trades, strategy_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("paper_balance")
      .eq("id", userId)
      .single(),
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("portfolios")
      .select("current_balance")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (sessionErr || !session) {
    // No active session — return null so callers can show onboarding/empty state
    return null;
  }

  const sessionCapital = Number(session.current_capital_nok ?? 0);
  const profileBalance = Number(profile?.paper_balance ?? 0);
  const walletBalance = Number(wallet?.balance ?? 0);
  const portfolioBalance = Number(portfolio?.current_balance ?? 0);

  const values = [sessionCapital, profileBalance, walletBalance, portfolioBalance].filter(
    (v) => v > 0,
  );

  const isSynced =
    values.length === 0 ||
    values.every((v) => Math.abs(v - sessionCapital) < 1);

  return {
    sessionCapitalNok: sessionCapital,
    sessionStartingNok: Number(session.starting_capital_nok ?? 0),
    sessionPnl: sessionCapital - Number(session.starting_capital_nok ?? 0),
    sessionTrades: Number(session.total_trades ?? 0),
    sessionStrategyId: session.strategy_id ?? null,
    profilePaperBalance: profileBalance,
    walletBalance,
    portfolioBalance,
    isSynced,
  };
}

/**
 * Server-side helper: returns the single number to display as "balance".
 * Prefer this over raw table queries in pages.
 */
export function getDisplayBalance(balance: UserBalance | null): number {
  if (!balance) return 100000; // default paper capital
  return balance.sessionCapitalNok;
}
