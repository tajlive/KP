/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PAPER TRADING API - SIMPLIFIED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Manages paper trading sessions.
 * Trades are executed automatically by the Cron Tick Engine every minute.
 * This API only handles session lifecycle: start, stop, status.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { mapRiskLevelToConfig } from "@/lib/auto-trading/risk-levels";
import type { TradeSide } from "@/lib/auto-trading/types";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/error";
import { NextRequest, NextResponse } from "next/server";

// Trade type for Supabase trades table
interface Trade {
  id: string;
  trading_pair: string;
  side: TradeSide;
  price: number;
  quantity: number;
  status: string;
  opened_at: string;
  exit_price?: number;
  closed_at?: string;
  pnl?: number;
  total_value?: number;
}

// ============================================
// POST: Manage paper trading session
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
          message: "You must be logged in to trade",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, strategyId, initialCapital, risk_level, pairs } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 },
      );
    }

    // ==========================================
    // ACTION: START PAPER TRADING SESSION
    // ==========================================
    if (action === "start") {
      if (!strategyId || !initialCapital) {
        return NextResponse.json(
          { error: "Missing required fields: strategyId, initialCapital" },
          { status: 400 },
        );
      }

      if (initialCapital < 1000 || initialCapital > 1000000) {
        return NextResponse.json(
          { error: "Initial capital must be between 1,000 and 1,000,000" },
          { status: 400 },
        );
      }

      // Check if user already has active session
      const { data: existingSession } = await supabase
        .from("trading_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("mode", "paper")
        .single();

      if (existingSession) {
        return NextResponse.json(
          { error: "You already have an active paper trading session" },
          { status: 400 },
        );
      }

      // Get strategy name (just verifying it exists)
      const { error: strategyError } = await supabase
        .from("auto_trading_strategies")
        .select("name")
        .eq("id", strategyId)
        .single();

      if (strategyError) {
        // handle error if needed, for now just continue
      }

      const riskConfig = mapRiskLevelToConfig(risk_level);
      const tradingPair = pairs && pairs.length > 0 ? pairs[0] : "BTCUSDT";

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          strategy_id: strategyId,
          mode: "paper",
          trading_pair: tradingPair,
          initial_capital: initialCapital,
          current_capital: initialCapital,
          status: "active",
          risk_config: riskConfig,
          strategy_config: {
            interval_minutes: 60,
            original_risk_level: risk_level || "balanced",
            pairs: pairs || [tradingPair],
          },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating session:", getErrorMessage(createError));
        return NextResponse.json(
          { error: "Failed to create session" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Paper trading session started. Trades will execute automatically via cron every minute.",
        session: {
          id: newSession.id,
          strategyId: newSession.strategy_id,
          mode: newSession.mode,
          initialCapital: newSession.initial_capital,
          currentCapital: newSession.current_capital,
          status: newSession.status,
          startedAt: newSession.started_at,
        },
      });
    }

    // ==========================================
    // ACTION: STOP SESSION
    // ==========================================
    if (action === "stop") {
      const { sessionId } = body;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID required" },
          { status: 400 },
        );
      }

      // Verify ownership
      const { data: session } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      // Stop session
      const { error: stopError } = await supabase
        .from("trading_sessions")
        .update({
          status: "stopped",
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (stopError) {
        return NextResponse.json(
          { error: "Failed to stop session" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Paper trading session stopped",
      });
    }

    // ==========================================
    // INVALID ACTION
    // ==========================================
    return NextResponse.json(
      {
        error: "Invalid action",
        validActions: ["start", "stop"],
        received: action,
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Unhandled error in paper trading API:",
      getErrorMessage(error),
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

// ============================================
// GET: Fetch session status and trades
// ============================================
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active paper trading session
    const { data: session } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("mode", "paper")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    // Get open trades from unified trades table
    let openTrades: Trade[] = [];
    let recentTrades: Trade[] = [];

    if (session) {
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("session_id", session.id)
        .eq("status", "filled")
        .is("closed_at", null)
        .order("opened_at", { ascending: false });

      openTrades = trades || [];

      const { data: closedTrades } = await supabase
        .from("trades")
        .select("*")
        .eq("session_id", session.id)
        .eq("status", "filled")
        .not("closed_at", "is", null)
        .order("closed_at", { ascending: false })
        .limit(20);

      recentTrades = closedTrades || [];
    }

    // Calculate P&L from trades
    const totalPnl = recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = recentTrades.filter((t) => (t.pnl || 0) > 0).length;
    const totalClosedTrades = recentTrades.length;
    const winRate =
      totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;

    return NextResponse.json({
      success: true,
      hasActiveSession: !!session,
      session: session
        ? {
            id: session.id,
            strategyId: session.strategy_id,
            mode: session.mode,
            tradingPair: session.trading_pair,
            initialCapital: session.initial_capital,
            currentCapital: session.current_capital,
            status: session.status,
            startedAt: session.started_at,
          }
        : null,
      trades: {
        openCount: openTrades.length,
        openTrades: openTrades.map((t) => ({
          id: t.id,
          pair: t.trading_pair,
          side: t.side,
          entryPrice: t.price,
          quantity: t.quantity,
          status: t.status,
          openedAt: t.opened_at,
        })),
        recentCount: recentTrades.length,
        recentTrades: recentTrades.map((t) => ({
          id: t.id,
          pair: t.trading_pair,
          side: t.side,
          entryPrice: t.price,
          exitPrice: t.exit_price,
          quantity: t.quantity,
          pnl: t.pnl,
          pnlPercent: ((t.pnl || 0) / (t.total_value || 1)) * 100,
          closedAt: t.closed_at,
        })),
      },
      stats: {
        totalPnl,
        winRate: winRate.toFixed(2),
        winningTrades,
        totalTrades: totalClosedTrades,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching paper trading status:",
      getErrorMessage(error),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
