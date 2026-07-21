import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateBacktestLiveGap } from "@/lib/trading/backtest-live-gap";
import { validateCronSecret } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const gap = await calculateBacktestLiveGap(supabase, 24);

    if (gap.summary.alertTriggered && process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, , { signal: controller.signal }
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *Backtest-Live Gap Alert*\nWorst gap: ${gap.summary.worstGapPct.toFixed(1)}% | Avg gap: ${gap.summary.avgGapPct.toFixed(1)}% | Strategies: ${gap.strategies.length}\n\n${gap.strategies.filter(s => s.gapPct < -20).map(s => `- ${s.strategyId}: ${s.gapPct.toFixed(1)}% (live ${s.liveReturnPct.toFixed(2)}% vs backtest ${s.backtestReturnPct.toFixed(2)}%)`).join("\n")}`,
        }),
      });
    }

    return NextResponse.json(gap);
  } catch (err) {
    console.error("[backtest-live-gap] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
