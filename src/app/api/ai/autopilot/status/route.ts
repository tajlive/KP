/**
 * GET /api/ai/autopilot/status
 *
 * Returnerer nåværende autopilot-status for innlogget bruker:
 *   - Regime, strategi, pairs
 *   - PnL, drawdown, win rate
 *   - Aktive sessions
 *   - Neste rebalansering
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const db = createServerClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Hent autopilot config ─────────────────────────────────────────
    const { data: autopilot, error: autopilotErr } = await db
      .from("ai_autopilot_configs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (autopilotErr) {
      return NextResponse.json({ error: autopilotErr.message }, { status: 500 });
    }

    if (!autopilot) {
      return NextResponse.json({
        active: false,
        message: "No autopilot configured",
      });
    }

    // ── 2. Hent aktive sessions ──────────────────────────────────────────
    const { data: sessions, error: sessionsErr } = await db
      .from("trading_sessions")
      .select(
        "id, strategy_id, trading_pair, status, current_capital, initial_capital, total_pnl, total_trades, winning_trades, losing_trades, last_tick_at, open_position"
      )
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active");

    if (sessionsErr) {
      console.error("[Autopilot Status] Sessions fetch failed:", sessionsErr.message);
    }

    // ── 3. Hent siste trades ─────────────────────────────────────────────
    const sessionIds = sessions?.map((s) => s.id) ?? [];
    let recentTrades: Array<{
      id: string;
      side: string;
      created_at: string;
      realized_pnl: number | null;
      session_id: string;
    }> = [];

    if (sessionIds.length > 0) {
      const { data: trades } = await db
        .from("trades")
        .select("id, side, created_at, realized_pnl, session_id")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(10);
      recentTrades = trades ?? [];
    }

    // ── 4. Beregn neste rebalansering ────────────────────────────────────
    const lastRebalance = autopilot.last_rebalance_at
      ? new Date(autopilot.last_rebalance_at)
      : null;
    const nextRebalance = lastRebalance
      ? new Date(lastRebalance.getTime() + 24 * 60 * 60 * 1000)
      : null;

    return NextResponse.json({
      active: autopilot.status === "active",
      status: autopilot.status,
      regime: {
        name: autopilot.detected_regime ?? "unknown",
        display:
          autopilot.detected_regime === "bull"
            ? "📈 Sterk opptrend"
            : autopilot.detected_regime === "bear"
              ? "📉 Nedtrend"
              : autopilot.detected_regime === "chop"
                ? "↔️ Sideways"
                : autopilot.detected_regime === "high-vol"
                  ? "⚡ Høy volatilitet"
                  : "❓ Uklart",
      },
      strategy: {
        id: autopilot.selected_strategy,
        display:
          autopilot.selected_strategy === "multisignal_aktiv"
            ? "Multisignal Aktiv"
            : autopilot.selected_strategy === "dca_trygg"
              ? "DCA Trygg"
              : autopilot.selected_strategy === "trend_balansert"
                ? "Trend Balansert"
                : autopilot.selected_strategy === "grid_bot"
                  ? "Grid Bot"
                  : autopilot.selected_strategy === "ensemble_ai"
                    ? "Ensemble AI"
                    : autopilot.selected_strategy === "ai_copy"
                      ? "AI Copy"
                      : autopilot.selected_strategy ?? "Ukjent",
      },
      capital: {
        total: autopilot.total_capital_nok,
        allocated: sessions?.reduce((sum, s) => sum + (s.initial_capital ?? 0), 0) ?? 0,
        current: sessions?.reduce((sum, s) => sum + (s.current_capital ?? 0), 0) ?? 0,
      },
      performance: {
        total_pnl_nok: autopilot.total_pnl_nok,
        total_pnl_pct: autopilot.total_pnl_pct,
        max_drawdown_pct: autopilot.max_drawdown_pct,
        win_rate: autopilot.win_rate,
      },
      sessions: sessions?.map((s) => ({
        id: s.id,
        pair: s.trading_pair,
        strategy: s.strategy_id,
        capital: {
          initial: s.initial_capital,
          current: s.current_capital,
        },
        trades: {
          total: s.total_trades,
          winning: s.winning_trades,
          losing: s.losing_trades,
        },
        pnl: (s.current_capital ?? 0) - (s.initial_capital ?? 0),
        has_open_position: !!s.open_position,
        last_tick_at: s.last_tick_at,
      })),
      recent_trades: recentTrades,
      rebalance: {
        last: autopilot.last_rebalance_at,
        next: nextRebalance?.toISOString() ?? null,
      },
      started_at: autopilot.started_at,
      updated_at: autopilot.updated_at,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Autopilot Status] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
