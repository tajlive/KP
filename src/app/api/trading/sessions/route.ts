import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  const supabase = (await createClient()) as any;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    mode = "paper",
    strategy_id = "dca",
    trading_pair = "BTCUSDT",
    initial_capital = 100000,
  } = body;

  // Ensure user_profiles row exists — trading_sessions.user_id FK references user_profiles(id)
  // Trigger handle_new_user() creates this on signup, but may be missing for older accounts
  const { error: profileErr } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
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
      strategy_id,
      strategy_config: { initial_capital },
      trading_pair,
      status: "active",
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
  const supabase = (await createClient()) as any;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, action } = body;

  if (!session_id || !action) {
    return NextResponse.json(
      { error: "session_id and action required" },
      { status: 400 },
    );
  }

  const validActions: Record<string, string> = {
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

  const updates: Record<string, unknown> = {
    status: newStatus,
  };

  if (action === "stop") {
    updates.stopped_at = new Date().toISOString();
  }

  const { data: session, error } = await supabase
    .from("trading_sessions")
    .update(updates)
    .eq("id", session_id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
