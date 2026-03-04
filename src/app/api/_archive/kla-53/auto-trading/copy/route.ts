/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * COPY TRADING API - SIMPLIFIED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Copy trades from another trader's session.
 * Trades are mirrored automatically by the Cron Tick Engine.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/error";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// POST: Start copying a trader
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
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { leaderId, sourceSessionId, initialCapital } = await request.json();

    if (!leaderId && !sourceSessionId) {
      return NextResponse.json(
        { error: "Missing required field: leaderId or sourceSessionId" },
        { status: 400 },
      );
    }

    // Fetch source session (either by direct ID or by finding the leader's active session)
    let sourceSession;
    let fetchError;

    if (sourceSessionId) {
      const { data, error } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("id", sourceSessionId)
        .eq("status", "active")
        .single();
      sourceSession = data;
      fetchError = error;
    } else {
      // Find leader's most recent active session
      const { data, error } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id", leaderId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();
      sourceSession = data;
      fetchError = error;
    }

    if (fetchError || !sourceSession) {
      return NextResponse.json(
        {
          error: "Session not found or not active",
          code: "SESSION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Check if user is trying to copy themselves
    if (sourceSession.user_id === user.id) {
      return NextResponse.json(
        {
          error: "You cannot copy your own session",
          code: "SELF_COPY_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    // Check if user already has an active paper trading session
    const { data: existingSession } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("mode", "paper")
      .single();

    if (existingSession) {
      return NextResponse.json(
        {
          error:
            "You already have an active paper trading session. Stop it first.",
          code: "ACTIVE_SESSION_EXISTS",
        },
        { status: 400 },
      );
    }

    // Use provided capital or default
    const capital = initialCapital || 10000;

    if (capital < 1000 || capital > 1000000) {
      return NextResponse.json(
        {
          error: "Initial capital must be between 1,000 and 1,000,000",
          code: "INVALID_CAPITAL",
        },
        { status: 400 },
      );
    }

    // Create copy session
    const { data: newSession, error: createError } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        strategy_id: sourceSession.strategy_id,
        mode: "paper",
        trading_pair: sourceSession.trading_pair,
        initial_capital: capital,
        current_capital: capital,
        status: "active",
        copy_source_session_id: sourceSession.id, // Link to source session
        strategy_config: sourceSession.strategy_config,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error(
        "Error creating copy session:",
        getErrorMessage(createError),
      );
      return NextResponse.json(
        {
          error: "Failed to create copy session",
          code: "CREATE_FAILED",
        },
        { status: 500 },
      );
    }

    // Log
    console.info("Copy trading session created:", {
      sourceSessionId: sourceSession.id,
      copySessionId: newSession.id,
      leaderId: sourceSession.user_id,
      userId: user.id,
      capital,
    });

    return NextResponse.json({
      success: true,
      message:
        "Successfully started copying trader. Trades will be mirrored automatically.",
      session: {
        id: newSession.id,
        sourceSessionId: sourceSession.id,
        sourceTraderUserId: sourceSession.user_id,
        capital: newSession.initial_capital,
        status: newSession.status,
        startedAt: newSession.started_at,
      },
    });
  } catch (error) {
    console.error("Error in copy trading POST:", getErrorMessage(error));
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
// DELETE: Stop copying a trader
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
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
        {
          error: "Session not found",
          code: "NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Stop the session
    const { error: stopError } = await supabase
      .from("trading_sessions")
      .update({
        status: "stopped",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (stopError) {
      console.error("Error stopping copy:", getErrorMessage(stopError));
      return NextResponse.json(
        {
          error: "Failed to stop copy trading",
          code: "UPDATE_FAILED",
        },
        { status: 500 },
      );
    }

    console.info("Copy trading session stopped:", {
      sessionId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully stopped copying trader",
    });
  } catch (error) {
    console.error("Error in copy trading DELETE:", getErrorMessage(error));
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
// GET: Get user's copy trading sessions
// ============================================
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // Get all copy trading sessions
    const { data: copySessions, error } = await supabase
      .from("trading_sessions")
      .select(
        `
        id,
        strategy_id,
        trading_pair,
        initial_capital,
        current_capital,
        status,
        copy_source_session_id,
        started_at,
        ended_at
      `,
      )
      .eq("user_id", user.id)
      .not("copy_source_session_id", "is", null)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching copy sessions:", getErrorMessage(error));
      return NextResponse.json(
        {
          error: "Failed to fetch copy trading sessions",
          code: "FETCH_FAILED",
        },
        { status: 500 },
      );
    }

    // Fetch source session details
    const formattedSessions = await Promise.all(
      (copySessions || []).map(async (session) => {
        const { data: sourceSession } = await supabase
          .from("trading_sessions")
          .select("id, user_id, strategy_id, total_pnl_pct, status")
          .eq("id", session.copy_source_session_id!)
          .single();

        const { data: sourceUser } = sourceSession
          ? await supabase
              .from("user_profiles")
              .select("id, display_name")
              .eq("id", sourceSession.user_id)
              .single()
          : { data: null };

        // Get trades for this copy session
        const { data: trades } = await supabase
          .from("trades")
          .select("pnl, status")
          .eq("session_id", session.id);

        const closedTrades =
          trades?.filter((t) => t.status === "filled" && t.pnl) || [];
        const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winRate =
          closedTrades.length > 0
            ? (closedTrades.filter((t) => (t.pnl || 0) > 0).length /
                closedTrades.length) *
              100
            : 0;

        return {
          id: session.id,
          sourceSessionId: session.copy_source_session_id,
          sourceTraderName: sourceUser?.display_name || "Unknown",
          capital: session.initial_capital,
          currentCapital: session.current_capital,
          totalPnl,
          totalPnlPercent: ((totalPnl / session.initial_capital) * 100).toFixed(
            2,
          ),
          winRate: winRate.toFixed(2),
          tradedCount: closedTrades.length,
          status: session.status,
          startedAt: session.started_at,
          endedAt: session.ended_at,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      copySessions: formattedSessions,
      total: formattedSessions.length,
    });
  } catch (error) {
    console.error("Error in copy trading GET:", getErrorMessage(error));
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
