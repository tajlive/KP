/**
 * Unified Trading Session API
 * Handles both paper and live trading sessions in a single endpoint
 * All sessions are stored in trading_sessions table only
 */

import { withAuth } from "@/lib/api-auth";
import { mapRiskLevelToConfig } from "@/lib/auto-trading/risk-levels";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema validation
const StartSessionSchema = z.object({
  strategy_id: z.enum(["dca", "trend_follow", "multi_signal", "grid"]),
  trading_pair: z.string().regex(/^[A-Z]+\/[A-Z]+$/, "Format must be BTC/USDT"),
  mode: z.enum(["paper", "live"]).default("paper"),
  initial_capital: z.number().positive().max(10_000_000),
  strategy_config: z.record(z.string(), z.unknown()).default({}),
  risk_level: z.string().optional(),
  risk_config: z
    .object({
      maxPositionSizePercent: z.number().default(2),
      stopLossPercent: z.number().default(1),
      trailingStopLossPercent: z.number().default(1.5),
      maxDailyLossPercent: z.number().default(5),
      maxDailyTrades: z.number().default(10),
      maxDrawdownPercent: z.number().default(15),
      maxLeverage: z.number().default(1),
    })
    .optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auto-trading/session
 * Start a new trading session (paper or live)
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const startTime = Date.now();

  try {
    // Rate limiting
    const { allowed } = checkRateLimit(`session:start:${user.id}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: 60 },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = StartSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      strategy_id,
      trading_pair,
      mode,
      initial_capital,
      strategy_config,
      risk_config,
      risk_level,
    } = parsed.data;
    const supabase = await createClient();

    // Ensure user_profiles row exists (trading_sessions.user_id FK references user_profiles(id))
    const { error: profileErr } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
    if (profileErr) {
      console.error(
        "[POST /api/auto-trading/session] user_profiles upsert error:",
        profileErr.code,
        profileErr.message,
      );
    }

    // Check tier for live trading
    if (mode === "live") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tier")
        .eq("user_id", user.id)
        .single();

      if (!profile || !["phd", "professor"].includes(profile.tier)) {
        return NextResponse.json(
          {
            error: "Live trading requires PhD or Professor tier",
            code: "TIER_REQUIRED",
          },
          { status: 402 },
        );
      }
    }

    // Check for existing active session
    const { data: existing } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("trading_pair", trading_pair)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: "Active session already exists for this pair",
          session_id: existing.id,
        },
        { status: 409 },
      );
    }

    // Use explicitly provided risk_config, OR map from risk_level, OR use balanced fallback
    const finalRiskConfig =
      risk_config || mapRiskLevelToConfig(risk_level || "balanced");

    const { data: session, error: insertError } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode,
        status: "active",
        strategy_id,
        strategy_config: {
          ...strategy_config,
          initialized_at: new Date().toISOString(),
          selected_risk_level: risk_level,
        },
        trading_pair,
        current_capital: initial_capital,
        initial_capital,
        allocated_capital_pct: 10.0,
        phase: mode === "paper" ? "paper" : "full",
        risk_config: finalRiskConfig,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_pnl: 0,
        max_drawdown_pct: 0,
        open_position: null,
        last_heartbeat: new Date().toISOString(),
        crash_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Active session already exists" },
          { status: 409 },
        );
      }
      console.error("Failed to create session:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    // Send notification
    await createNotification(
      supabase,
      user.id,
      "system",
      "Trading Session Startet",
      `Din ${mode === "paper" ? "Paper" : "Live"} trading session for ${trading_pair} er i gang.`,
      { session_id: session.id, strategy: strategy_id },
    );

    return NextResponse.json(
      {
        success: true,
        session,
        message: `${mode === "paper" ? "Paper" : "Live"} trading session started`,
        performance: { response_time_ms: Date.now() - startTime },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Session POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

/**
 * GET /api/auto-trading/session - List user sessions
 */
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active";
    const mode = searchParams.get("mode");

    const supabase = await createClient();

    let query = supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", user.id);
    if (status !== "all") query = query.eq("status", status);
    if (mode) query = query.eq("mode", mode);

    const { data: sessions, error } = await query.order("started_at", {
      ascending: false,
    });

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      count: sessions?.length || 0,
    });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
