/**
 * POST /api/user/trading-sessions/restart
 *
 * Restarter alle stoppete/crashede trading sessions for innlogget bruker.
 * Brukes etter circuit breaker eller manuell stopp.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req: NextRequest, { user }) => {
  const db = createClient();
  const now = new Date().toISOString();

  try {
    // Find all stopped/crashed sessions for this user
    const { data: sessions, error: fetchError } = await db
      .from("trading_sessions")
      .select("id, trading_pair, strategy_id, status, total_trades, total_pnl, current_capital, initial_capital, last_status_message")
      .eq("user_id", user.id)
      .in("status", ["stopped", "crashed"])
      .is("archived", false);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch sessions", detail: fetchError.message },
        { status: 500 },
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        restarted: 0,
        message: "Ingen stoppede/crashede sessions å restarte",
      });
    }

    // Restart all stopped/crashed sessions
    const sessionIds = sessions.map((s) => s.id);
    const { error: updateError } = await db
      .from("trading_sessions")
      .update({
        status: "active",
        last_status_message: null,
        last_heartbeat: now,
        last_tick_at: now,
        updated_at: now,
      })
      .in("id", sessionIds);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to restart sessions", detail: updateError.message },
        { status: 500 },
      );
    }

    // Log the restart
    await db.from("trading_logs" as never).insert({
      user_id: user.id,
      action: "sessions_restarted",
      details: {
        count: sessions.length,
        session_ids: sessionIds,
        previous_statuses: sessions.map((s) => ({ id: s.id, status: s.status, reason: s.last_status_message })),
      } as never,
    } as never);

    return NextResponse.json({
      success: true,
      restarted: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        pair: s.trading_pair,
        strategy_id: s.strategy_id,
        previous_status: s.status,
        trades: s.total_trades,
        pnl: (s.current_capital ?? 0) - (s.initial_capital ?? 0),
        capital: s.current_capital,
      })),
    });
  } catch (err) {
    console.error("[restart-sessions] error:", err);
    return NextResponse.json(
      { error: "Restart failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
});
