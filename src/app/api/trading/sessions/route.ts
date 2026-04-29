import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Json } from "@/types/database.types";
import {
  enrichStrategyConfigForSession,
  parseInitialCapitalFromConfig,
  parseTradingPairFromConfig,
  getDbRiskLevelEnum,
  resolveProductStrategyId,
} from "@/lib/auto-trading/strategy-catalog";

export const dynamic = "force-dynamic";

function getAuthUser(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);
  return supabase.auth.getUser();
}

export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const mode = request.nextUrl.searchParams.get("mode");
    const statusFilter = request.nextUrl.searchParams.get("status");

    let query = supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (mode) query = query.eq("mode", mode);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data: sessions, error } = await query;

    if (error) {
      console.error(
        "[GET /api/trading/sessions] DB error:",
        error.code,
        error.message,
      );
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (err) {
    console.error("[GET /api/trading/sessions] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const {
    data: { user },
    error: authError,
  } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const body = await request.json();
  const {
    mode = "paper",
    strategy_id = "dca_trygg",
    trading_pair: bodyPair,
    initial_capital: bodyCapital,
    strategy_config: bodyStrategyConfig = {},
  } = body;

  const productId = resolveProductStrategyId(strategy_id);

  const mergedConfig: { [key: string]: unknown } = {
    ...(typeof bodyStrategyConfig === "object" && bodyStrategyConfig !== null
      ? (bodyStrategyConfig as Record<string, unknown>)
      : {}),
    ...(bodyPair != null ? { trading_pair: bodyPair } : {}),
    ...(bodyCapital != null ? { initial_capital: bodyCapital } : {}),
  };

  const trading_pair = parseTradingPairFromConfig(productId, mergedConfig);
  const initial_capital = parseInitialCapitalFromConfig(mergedConfig);
  const strategy_config = enrichStrategyConfigForSession(
    productId,
    mergedConfig,
  );

  // Ensure user_profiles row exists — trading_sessions.user_id FK references user_profiles(id)
  // Trigger handle_new_user() creates this on signup, but may be missing for older accounts
  const { error: profileErr } = await supabase
    .from("user_profiles")
    .upsert(
      { id: user.id, user_id: user.id },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (profileErr) {
    console.error(
      "[POST /api/trading/sessions] user_profiles upsert error:",
      profileErr.code,
      profileErr.message,
    );
  }

  // Check for existing active session for this mode
  const { data: existingActive } = await supabase
    .from("trading_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active")
    .limit(1);

  if (existingActive && existingActive.length > 0) {
    return NextResponse.json({ session: existingActive[0], existing: true });
  }

  // Create new session - matches canonical schema columns
  const { data: session, error } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: user.id,
      mode,
      strategy_id: productId,
      strategy_config: strategy_config as unknown as Json,
      trading_pair,
      risk_level: getDbRiskLevelEnum(productId),
      status: "active",
      current_capital: initial_capital,
      initial_capital,
      current_capital_nok: initial_capital,
      starting_capital_nok: initial_capital,
      started_at: new Date().toISOString(),
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "[POST /api/trading/sessions] Insert error:",
      error.code,
      error.message,
    );
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const {
    data: { user },
    error: authError,
  } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const body = await request.json();
  const { session_id, action } = body;

  if (!session_id || !action) {
    return NextResponse.json(
      { error: "session_id and action required" },
      { status: 400 },
    );
  }

  const validActions: { [key: string]: string } = {
    pause: "paused",
    resume: "active",
    stop: "stopped",
  };

  const newStatus = validActions[action];
  if (!newStatus) {
    return NextResponse.json(
      { error: "Invalid action. Use: pause, resume, stop" },
      { status: 400 },
    );
  }

  const updates: {
    status: string;
    stopped_at?: string;
    archived?: boolean;
    archived_at?: string;
  } = {
    status: newStatus,
  };

  if (action === "stop") {
    updates.stopped_at = new Date().toISOString();
    updates.archived = true;
    updates.archived_at = new Date().toISOString();
  }

  const { data: session, error } = await supabase
    .from("trading_sessions")
    .update(updates).eq("id", session_id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
