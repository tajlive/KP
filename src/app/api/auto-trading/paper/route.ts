import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const strategy = body.strategy || "dca";
    const risk_level = body.risk_level || "moderat";
    const pairs: string[] = body.pairs || ["BTCUSDT"];

    const { data: existing } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, session_id: existing.id });
    }

    const { data, error } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
        status: "active",
        strategy_id: strategy,
        strategy_config: { risk_level, pairs },
        starting_capital_nok: 100000,
        current_capital_nok: 100000,
        trading_pair: pairs[0] || "BTCUSDT",
        initial_capital: 100000,
        current_capital: 100000,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_pnl: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, session_id: data.id });
  } catch (error) {
    console.error("[auto-trading/paper POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
