/**
 * GET /api/user/trading-diagnostics
 *
 * Full trading pipeline diagnose for innlogget bruker.
 * Returnerer status for sessions, ticks, trades, cron, og strategier.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";
import { resolveTickStrategyEngineKey } from "@/lib/trading/strategy-id-aliases";
import { resolveStrategy } from "@/lib/trading/strategies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const db = createClient();
  const diagnostics: Record<string, unknown> = {
    user_id: user.id,
    checked_at: new Date().toISOString(),
  };

  try {
    // ── 1. TRADING SESSIONS ─────────────────────────────────────────────────
    const { data: sessions, error: sessionsError } = await db
      .from("trading_sessions")
      .select(
        "id, trading_pair, strategy_id, mode, status, total_trades, total_pnl, current_capital, initial_capital, current_capital_nok, starting_capital_nok, last_tick_at, last_heartbeat, open_position, created_at, started_at, stopped_at, archived",
      )
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    const sessionList = (sessions || []).map((s) => {
      const engineKey = resolveTickStrategyEngineKey(s.strategy_id);
      const strategy = engineKey ? resolveStrategy(engineKey) : undefined;
      return {
        id: s.id,
        pair: s.trading_pair,
        strategy_id: s.strategy_id,
        resolved_engine: engineKey,
        strategy_found: !!strategy,
        mode: s.mode,
        status: s.status,
        total_trades: s.total_trades,
        total_pnl: (s.current_capital_nok ?? s.current_capital ?? 0) - (s.starting_capital_nok ?? s.initial_capital ?? 0),
        current_capital: s.current_capital,
        initial_capital: s.initial_capital,
        last_tick_at: s.last_tick_at,
        last_heartbeat: s.last_heartbeat,
        open_position: s.open_position,
        created_at: s.created_at,
        stopped_at: s.stopped_at,
        archived: s.archived,
      };
    });

    const activeSessions = sessionList.filter((s) => s.status === "active");
    const stoppedSessions = sessionList.filter((s) => s.status === "stopped");
    const manualSessions = activeSessions.filter((s) => s.strategy_id === "manual");
    const unmappedSessions = activeSessions.filter((s) => !s.resolved_engine);

    // Portfolio drawdown check (same logic as tick circuit breaker)
    const portfolioInitial = activeSessions.reduce(
      (sum, s) => sum + Number(s.initial_capital || 0),
      0,
    );
    const portfolioCurrent = activeSessions.reduce(
      (sum, s) => sum + Number(s.current_capital || 0),
      0,
    );
    const drawdown =
      portfolioInitial > 0
        ? ((portfolioInitial - portfolioCurrent) / portfolioInitial) * 100
        : 0;

    diagnostics.sessions = {
      total: sessionList.length,
      active: activeSessions.length,
      stopped: stoppedSessions.length,
      manual_skipped: manualSessions.length,
      unmapped_strategies: unmappedSessions.length,
      list: sessionList,
    };

    diagnostics.portfolio = {
      initial: portfolioInitial,
      current: portfolioCurrent,
      drawdown_pct: Number(drawdown.toFixed(2)),
      circuit_breaker_would_trigger: drawdown >= 5,
    };

    // ── 2. SISTE TRADES ─────────────────────────────────────────────────────
    const { data: recentTrades, error: tradesError } = await db
      .from("trades")
      .select("id, symbol, side, quantity, price, created_at, session_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    diagnostics.trades = {
      recent_count: recentTrades?.length ?? 0,
      recent: recentTrades || [],
      error: tradesError?.message || null,
    };

    // ── 3. CRON JOB STATUS (system-wide) ────────────────────────────────────
    let cronStatus: Record<string, unknown> = { error: "Could not check" };
    try {
      const { data: cronRuns } = await db
        .from("cron_job_runs")
        .select("job_name, status, finished_at, error_summary")
        .order("finished_at", { ascending: false })
        .limit(20);

      const tickRuns =
        cronRuns?.filter((r) => r.job_name === "tick").slice(0, 5) || [];
      const autoTradeRuns =
        cronRuns?.filter((r) => r.job_name === "auto-trade").slice(0, 5) || [];

      cronStatus = {
        tick_latest: tickRuns[0] || null,
        tick_last_5: tickRuns,
        auto_trade_latest: autoTradeRuns[0] || null,
        all_jobs: cronRuns?.map((r) => ({
          job: r.job_name,
          status: r.status,
          finished_at: r.finished_at,
        })),
      };
    } catch (e) {
      cronStatus = { error: (e as Error).message };
    }

    diagnostics.cron = cronStatus;

    // ── 4. AI SIGNALS ───────────────────────────────────────────────────────
    const { data: latestSignal } = await db
      .from("trading_signals")
      .select("symbol, action, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    diagnostics.signals = {
      latest: latestSignal || null,
    };

    // ── 5. SUMMARY / VERDIKT ────────────────────────────────────────────────
    const issues: string[] = [];

    if (activeSessions.length === 0 && stoppedSessions.length > 0) {
      issues.push("All sessions are STOPPED — likely circuit breaker or manual stop");
    }
    if (activeSessions.length === 0 && stoppedSessions.length === 0) {
      issues.push("No trading sessions found — user has not started any bots");
    }
    if (unmappedSessions.length > 0) {
      issues.push(
        `${unmappedSessions.length} session(s) have unmapped strategy_id — tick will error`,
      );
    }
    if (manualSessions.length > 0) {
      issues.push(
        `${manualSessions.length} manual session(s) skipped by tick cron`,
      );
    }
    if (drawdown >= 5) {
      issues.push(
        `Portfolio drawdown ${drawdown.toFixed(2)}% ≥ 5% — circuit breaker will STOP all sessions on next tick`,
      );
    }
    if ((recentTrades || []).length === 0 && activeSessions.length > 0) {
      issues.push(
        "Active sessions but zero trades — tick may not be running or strategies are holding",
      );
    }
    if (
      cronStatus.tick_latest &&
      (cronStatus.tick_latest as { status?: string }).status !== "success"
    ) {
      issues.push("Latest tick cron job FAILED");
    }

    diagnostics.summary = {
      healthy: issues.length === 0,
      issues,
    };

    return NextResponse.json(diagnostics);
  } catch (err) {
    console.error("[trading-diagnostics] error:", err);
    return NextResponse.json(
      {
        error: "Diagnostics failed",
        detail: (err as Error).message,
        user_id: user.id,
      },
      { status: 500 },
    );
  }
});
