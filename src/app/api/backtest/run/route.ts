import { BacktestEngine } from "@/lib/backtest/backtest-engine";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await req.json();

  try {
    const engine = new BacktestEngine();
    const result = await engine.runBacktest({
      initialCapital: input.initialCapital,
      monthsAgo: input.monthsAgo,
      riskProfile: input.riskProfile,
      strategyId: input.strategyId,
      symbols: input.symbols || ["BTCUSDT"],
    });

    // Log backtest for analytics (Optional, can be removed if table doesn't exist yet)
    // await supabase.from('backtests').insert({
    //   user_id: user.id,
    //   input,
    //   result,
    //   created_at: new Date().toISOString(),
    // });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[BACKTEST:ERROR] Backtest failed", error);
    return NextResponse.json({ error: "Backtest failed" }, { status: 500 });
  }
}
