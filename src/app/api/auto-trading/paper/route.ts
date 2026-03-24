import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paperTradeSchema = z.object({
  strategy: z.enum(["dca", "trend", "grid", "multi", "ai-copy"]).default("dca"),
  risk_level: z.enum(["low", "medium", "high"]).default("medium"),
  pairs: z.array(z.string()).default(["BTCUSDT"]),
  starting_capital_nok: z.number().min(10000).max(1000000).default(100000),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = paperTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      strategy,
      risk_level,
      pairs,
      starting_capital_nok: startingCapital,
    } = parsed.data;

    const supabase = createClient();

    const { data: existing } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        session_id: existing.id,
        reused_session: true,
      });
    }

    const { data, error } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
        status: "active",
        strategy_id: strategy,
        strategy_config: { risk_level, pairs },
        starting_capital_nok: startingCapital,
        current_capital_nok: startingCapital,
        trading_pair: pairs[0] || "BTCUSDT",
        initial_capital: startingCapital,
        current_capital: startingCapital,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_pnl: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      session_id: data.id,
      reused_session: false,
    });
  } catch (error) {
    console.error("[auto-trading/paper POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
