/**
 * @file getUserDashboardMetrics.ts
 * @description SINGLE SOURCE OF TRUTH for dashboard metrics aggregation.
 *
 * ALL dashboard cards showing P&L, trade count, win rate, and total capital
 * MUST go through this function. Do NOT compute aggregates ad-hoc in pages
 * or API routes.
 *
 * Historical context (2026-04-26):
 * - Previously `dashboard/page.tsx` only looked at the single most-recent
 *   ACTIVE session and its trades, so completed sessions were invisible.
 * - `bot-status` summed ALL user trades with no session/mode filter.
 * - `paper-trading/balance` derived P&L from session capital deltas.
 * - P0 unified those paths into one consistent filter set.
 * - P2 (2026-04-26) moved aggregation from TypeScript memory-loop to
 *   PostgreSQL RPC (`get_dashboard_metrics`) for O(1) network cost.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { CONTAMINATION_CUTOFF } from "@/lib/trading/clean-trades";
import { getOkxLiveBalance } from "@/lib/trading/okx-live";

type TradingSessionRow =
  Database["public"]["Tables"]["trading_sessions"]["Row"];

export type DashboardMode = "paper" | "live";

export type SessionScope = "all" | "active" | "active_and_completed";

export interface DashboardMetricsInput {
  /** Authenticated Supabase client (SSR or service-role). */
  supabaseClient: SupabaseClient<Database>;
  userId: string;
  mode: DashboardMode;
  /** Which sessions to include when aggregating trades. */
  sessionScope?: SessionScope;
}

export interface DashboardMetrics {
  /** Aggregated realised P&L for the chosen scope (NOK). */
  totalPnl: number;
  /** Number of trades for the chosen scope. */
  totalTrades: number;
  /** 0–1 fraction (e.g. 0.65 = 65 %). */
  winRate: number;
  /** Best available capital figure for the mode (NOK). */
  totalCapital: number;
  /** Starting capital for the active session, or default. */
  startingCapital: number;
  /** Number of winning trades. */
  winningTrades: number;
  /** Number of losing trades. */
  losingTrades: number;
  /** Number of sessions in the chosen scope. */
  sessionCount: number;
  /**
   * Kontobalanse fra paper_accounts.current_balance — source of truth
   * (AGENTS.md). Skal brukes av alle flater som viser "balanse"
   * (dashboard-hero, kort). totalCapital er sesjons-/bot-kapital og kan
   * avvike. null for live-modus eller når kontoen ikke finnes.
   */
  accountBalance: number | null;
  accountBalanceUpdatedAt: string | null;
  /** Total investert i åpne posisjoner (kjøpspris × antall) */
  investedCapital: number;
  /** Antall åpne posisjoner (par med aktiv investering) */
  positionCount: number;
  /** The 5 most recent sessions for display in the dashboard. */
  recentSessions: TradingSessionRow[];
}

export class DashboardMetricsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DashboardMetricsError";
  }
}

/** Maps a session-scope enum to the set of statuses that should be included. */
function sessionStatusesForScope(scope: SessionScope): string[] {
  switch (scope) {
    case "active":
      return ["active"];
    case "active_and_completed":
      return ["active", "stopped"];
    case "all":
      // All non-archived sessions are included; archived acts as soft-delete.
      return ["active", "paused", "crashed", "stopped"];
  }
}

/**
 * Statuser som skal telle i KAPITAL-summering (totalCapital/startingCapital).
 *
 * 2026-08-09 (P0, Tom-rapport): dashboardet viste 9 492 kr fra den STOPPEDE
 * ADA-sesjonen (01.08) pluss den aktive OKX-sesjonen — Tom trodde live-kontoen
 * hans hadde ~11 000 kr mens faktisk OKX-saldo var ~1 458 kr. En stoppet
 * sesjons current_capital_nok er en FRYST historisk verdi, ikke penger brukeren
 * har nå. Kapital summeres derfor KUN over aktive sesjoner. Trade-statistikk
 * (totalTrades/totalPnl) kan fortsatt telle historikk — men kapital er nå-tilstand.
 */
const CAPITAL_STATUSES = ["active"] as const;

/**
 * Returns unified dashboard metrics for a single user + mode.
 *
 * Implementation strategy:
 * 1. PRIMARY: PostgreSQL RPC `get_dashboard_metrics` — single query, O(1) network.
 * 2. FALLBACK: TypeScript aggregation if RPC is unavailable (e.g. local dev without migration).
 */
/**
 * Kontobalanse: paper_accounts.current_balance er source of truth (R1).
 * Sessions-basert sum er PRINTET kapital per sesjon og forvrenger totalen —
 * brukes KUN som nød-fallback når paper_accounts mangler helt.
 */
async function getAccountBalance(
  supabaseClient: SupabaseClient<Database>,
  userId: string,
): Promise<{
  available: number;
  invested: number;
  positionCount: number;
  updated_at: string | null;
} | null> {
  // 1. PRIMÆR: paper_accounts (source of truth per AGENTS.md arkitektur-sannhet #1)
  const { data: paperAccount, error: paError } = await supabaseClient
    .from("paper_accounts")
    .select("current_balance, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (
    !paError &&
    paperAccount &&
    typeof paperAccount.current_balance === "number"
  ) {
    const available = paperAccount.current_balance;
    // Hent posisjonsdata (invested + positionCount) fra aktive sesjoner
    const { data: positions } = await supabaseClient
      .from("trading_sessions")
      .select("open_position")
      .eq("user_id", userId)
      .eq("mode", "paper")
      .in("status", ["active", "paused"]);
    let invested = 0;
    let positionCount = 0;
    for (const s of positions ?? []) {
      const pos = s.open_position as {
        quantity?: number;
        entry_price?: number;
      } | null;
      if (pos?.quantity && pos?.entry_price) {
        invested += pos.quantity * pos.entry_price;
        positionCount++;
      }
    }
    return {
      available,
      invested,
      positionCount,
      updated_at: paperAccount.updated_at ?? null,
    };
  }

  // 2. FALLBACK: Kun hvis paper_accounts mangler helt — summer sessions.
  // P1-B (2026-08-11): KUN active/paused — stoppede sesjoners
  // current_capital_nok er fryst historikk, ikke levende penger (P0-regel,
  // CAPITAL_STATUSES over). Å inkludere stopped er samme feilklasse som
  // P0-inflasjonen.
  const { data: sessions, error: sessionError } = await supabaseClient
    .from("trading_sessions")
    .select("current_capital_nok, open_position")
    .eq("user_id", userId)
    .eq("mode", "paper")
    .in("status", ["active", "paused"]);

  if (!sessionError && sessions && sessions.length > 0) {
    let available = 0;
    let invested = 0;
    let positionCount = 0;
    for (const s of sessions) {
      available += Number(s.current_capital_nok ?? 0);
      const pos = s.open_position as {
        quantity?: number;
        entry_price?: number;
      } | null;
      if (pos?.quantity && pos?.entry_price) {
        invested += pos.quantity * pos.entry_price;
        positionCount++;
      }
    }
    if (Number.isFinite(available + invested) && available + invested > 0) {
      return { available, invested, positionCount, updated_at: null };
    }
  }

  return null;
}

/** Komplement til getAccountBalance — FIKS 6. */
async function getAccountInitial(
  supabaseClient: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  const { data, error } = await supabaseClient
    .from("paper_accounts")
    .select("initial_balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return typeof data?.initial_balance === "number"
    ? data.initial_balance
    : null;
}

export async function getUserDashboardMetrics(
  input: DashboardMetricsInput,
): Promise<DashboardMetrics> {
  const {
    supabaseClient,
    userId,
    mode,
    sessionScope = "active_and_completed",
  } = input;

  // Kontobalanse (source of truth) — hentes alltid for paper-modus slik at
  // ALLE retur-veier (RPC + fallbacks) leverer samme balanse-tall.
  const balResult =
    mode === "paper" ? await getAccountBalance(supabaseClient, userId) : null;
  const accountBalance = balResult?.available ?? null;
  const accountBalanceUpdatedAt = balResult?.updated_at ?? null;
  const investedCapital = balResult?.invested ?? 0;
  const positionCount = balResult?.positionCount ?? 0;
  const accountInitial =
    mode === "paper" ? await getAccountInitial(supabaseClient, userId) : null;

  // Live: hent OKX-saldo live fra exchange (2026-08-11: Kraken erstattet av OKX).
  // Kraken d10c6096 er stopped og nøkkel inaktiv — dashboard live-mode viser KUN OKX.
  let liveOkxBalanceNok: number | null = null;
  if (mode === "live") {
    const okx = await getOkxLiveBalance(supabaseClient, userId);
    liveOkxBalanceNok = okx.balanceNok;
  }

  // ------------------------------------------------------------------
  // 1. Fetch recent sessions for display (always needed)
  // ------------------------------------------------------------------
  const { data: recentSessions, error: sessionsError } = await supabaseClient
    .from("trading_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("mode", mode)
    .is("archived", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (sessionsError) {
    console.error(
      "[getUserDashboardMetrics] failed to fetch recent sessions:",
      sessionsError.message,
    );
  }

  // ------------------------------------------------------------------
  // 2. Attempt PostgreSQL RPC (enterprise path)
  // ------------------------------------------------------------------
  const statuses = sessionStatusesForScope(sessionScope);

  try {
    const { data: rpcRows, error: rpcError } = await supabaseClient.rpc(
      "get_dashboard_metrics",
      {
        p_user_id: userId,
        p_mode: mode,
        p_statuses: statuses,
        // P1-A (2026-08-11): samme forurensings-cutoff som getCleanTrades
        // (Resultater-siden) — uten dette summerer RPC-en rå realized_pnl
        // fra oversell-perioden og dashboardet avviker fra Resultater.
        p_cutoff: CONTAMINATION_CUTOFF,
      },
    );

    if (rpcError) {
      throw new DashboardMetricsError(
        `RPC aggregation failed: ${rpcError.message}`,
        "RPC_AGGREGATION_FAILED",
      );
    }

    const row = rpcRows?.[0];
    if (!row) {
      // No data returned — valid state (no sessions/trades).
      const metrics = await fallbackMetrics(supabaseClient, userId, mode);
      return {
        ...metrics,
        recentSessions: recentSessions || [],
        investedCapital,
        positionCount,
      };
    }

    const totalPnl = Number(row.total_pnl ?? 0);
    const totalTrades = Number(row.total_trades ?? 0);
    const winningTrades = Number(row.winning_trades ?? 0);
    const losingTrades = Number(row.losing_trades ?? 0);
    let totalCapital = Number(row.total_capital ?? 0);
    let startingCapital = 0;

    // RPC may not return starting_capital; derive from fallback when needed

    // Fallback to profile if no capital data exists
    if (totalCapital === 0 && mode === "paper") {
      const fallback = await getProfileFallback(supabaseClient, userId);
      totalCapital = fallback.totalCapital;
      startingCapital = fallback.startingCapital;
    }

    // Live: startingCapital kan mangle fra RPC — utled fra første live-sesjon
    // slik at totalReturn (totalPnl/startingCapital) kan beregnes.
    if (mode === "live" && startingCapital === 0) {
      const { data: firstLiveSession } = await supabaseClient
        .from("trading_sessions")
        .select("starting_capital_nok")
        .eq("user_id", userId)
        .eq("mode", "live")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      startingCapital = Number(firstLiveSession?.starting_capital_nok ?? 0);
    }

    const winRate =
      winningTrades + losingTrades > 0
        ? winningTrades / (winningTrades + losingTrades)
        : 0;

    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalCapital: Math.round(totalCapital * 100) / 100,
      startingCapital:
        accountInitial != null
          ? accountInitial
          : Math.round(startingCapital * 100) / 100,
      winningTrades,
      losingTrades,
      sessionCount: Number(row.session_count ?? 0),
      accountBalance: mode === "live" ? liveOkxBalanceNok : accountBalance,
      accountBalanceUpdatedAt,
      investedCapital,
      positionCount,
      recentSessions: recentSessions || [],
    };
  } catch (error) {
    // If RPC throws (e.g. function does not exist), fall back to TypeScript aggregation
    if (
      error instanceof DashboardMetricsError &&
      error.code === "RPC_AGGREGATION_FAILED"
    ) {
      console.warn(
        "[getUserDashboardMetrics] RPC unavailable, falling back to TS aggregation:",
        error.message,
      );
      const metrics = await tsAggregationFallback(input);
      return {
        ...metrics,
        recentSessions: recentSessions || [],
        investedCapital,
        positionCount,
      };
    }
    throw error;
  }
}

/** Fetch paper balance: paper_accounts.current_balance first, then user_profiles.paper_balance. */
async function getProfileFallback(
  supabaseClient: SupabaseClient<Database>,
  userId: string,
): Promise<{ totalCapital: number; startingCapital: number }> {
  // Primary: paper_accounts.current_balance (source of truth)
  const { data: paperAccount } = await supabaseClient
    .from("paper_accounts")
    .select("current_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (typeof paperAccount?.current_balance === "number") {
    return {
      totalCapital: paperAccount.current_balance,
      startingCapital: 100_000,
    };
  }

  // Secondary fallback: user_profiles.paper_balance (synced by DB trigger)
  const { data: profile, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("paper_balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.warn(
      "[getUserDashboardMetrics] profile fetch failed:",
      profileError.message,
    );
  }

  return {
    totalCapital: profile?.paper_balance ?? 100_000,
    startingCapital: 100_000,
  };
}

/** Complete fallback when RPC returns no rows (no sessions exist). */
async function fallbackMetrics(
  supabaseClient: SupabaseClient<Database>,
  userId: string,
  mode: DashboardMode,
): Promise<DashboardMetrics> {
  if (mode === "paper") {
    const fb = await getProfileFallback(supabaseClient, userId);
    return {
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0,
      totalCapital: fb.totalCapital,
      startingCapital: fb.startingCapital,
      winningTrades: 0,
      losingTrades: 0,
      sessionCount: 0,
      accountBalance: fb.totalCapital,
      accountBalanceUpdatedAt: null,
      investedCapital: 0,
      positionCount: 0,
      recentSessions: [],
    };
  }

  return {
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
    totalCapital: 0,
    startingCapital: 0,
    winningTrades: 0,
    losingTrades: 0,
    sessionCount: 0,
    accountBalance: null,
    accountBalanceUpdatedAt: null,
    investedCapital: 0,
    positionCount: 0,
    recentSessions: [],
  };
}

// ============================================================================
// TypeScript fallback (kept for backward compatibility / local dev without RPC)
// ============================================================================

async function tsAggregationFallback(
  input: DashboardMetricsInput,
): Promise<DashboardMetrics> {
  const { supabaseClient, userId, mode, sessionScope = "active" } = input;

  const statuses = sessionStatusesForScope(sessionScope);

  const { data: sessions, error: sessionsError } = await supabaseClient
    .from("trading_sessions")
    .select("id, current_capital_nok, starting_capital_nok, status")
    .eq("user_id", userId)
    .eq("mode", mode)
    .is("archived", false)
    .in(
      "status",
      statuses as readonly ("active" | "paused" | "crashed" | "stopped")[],
    );

  if (sessionsError) {
    throw new DashboardMetricsError(
      `Failed to fetch trading sessions: ${sessionsError.message}`,
      "SESSIONS_QUERY_FAILED",
    );
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);

  // Kapital summeres KUN over aktive sesjoner — stoppede sesjoners
  // current_capital_nok er fryste historiske verdier, ikke nåværende penger.
  // (2026-08-09: Tom så 9 492 kr fra stoppet ADA-sesjon som levende kapital.)
  const capitalSessions = (sessions ?? []).filter((s) =>
    (CAPITAL_STATUSES as readonly string[]).includes(s.status),
  );

  let totalTrades = 0;
  let totalPnl = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  if (sessionIds.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      const chunk = sessionIds.slice(i, i + CHUNK_SIZE);

      const { data: tradeRows, error: tradesError } = await supabaseClient
        .from("trades")
        .select("realized_pnl")
        .in("session_id", chunk)
        .eq("user_id", userId)
        .eq("mode", mode)
        .gte("executed_at", CONTAMINATION_CUTOFF) // P1-A: samme cutoff som RPC/Resultater
        .not("status", "in", '("cancelled","failed")');

      if (tradesError) {
        throw new DashboardMetricsError(
          `Failed to fetch trades: ${tradesError.message}`,
          "TRADES_QUERY_FAILED",
        );
      }

      for (const t of tradeRows ?? []) {
        totalTrades += 1;
        const pnl = t.realized_pnl ?? 0;
        totalPnl += pnl;
        if (pnl > 0) {
          winningTrades += 1;
        } else if (pnl < 0) {
          losingTrades += 1;
        }
      }
    }
  }

  let totalCapital = capitalSessions.reduce(
    (sum, s) => sum + (s.current_capital_nok ?? 0),
    0,
  );

  let startingCapital = capitalSessions.reduce(
    (sum, s) => sum + (s.starting_capital_nok ?? 0),
    0,
  );

  if (totalCapital === 0 && mode === "paper") {
    const fb = await getProfileFallback(supabaseClient, userId);
    totalCapital = fb.totalCapital;
    startingCapital = fb.startingCapital;
  }

  const winRate =
    winningTrades + losingTrades > 0
      ? winningTrades / (winningTrades + losingTrades)
      : 0;

  const balResult =
    mode === "paper" ? await getAccountBalance(supabaseClient, userId) : null;
  const accountBalance = balResult?.available ?? null;
  const accountBalanceUpdatedAt = balResult?.updated_at ?? null;
  const investedCapital = balResult?.invested ?? 0;
  const positionCount = balResult?.positionCount ?? 0;

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalTrades,
    winRate: Math.round(winRate * 100) / 100,
    totalCapital: Math.round(totalCapital * 100) / 100,
    startingCapital: Math.round(startingCapital * 100) / 100,
    winningTrades,
    losingTrades,
    sessionCount: sessions?.length ?? 0,
    accountBalance,
    accountBalanceUpdatedAt,
    investedCapital,
    positionCount,
    recentSessions: [], // Fallback doesn't fetch recent sessions details
  };
}
