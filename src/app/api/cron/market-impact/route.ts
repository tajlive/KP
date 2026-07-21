import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateMarketImpact } from "@/lib/trading/market-impact";
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
    const impact = await calculateMarketImpact(supabase, 24);

    if (impact.summary.alertTriggered && process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, , { signal: controller.signal }
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ *Market Impact Alert* — ${impact.summary.highImpactCount} high + ${impact.summary.mediumImpactCount} medium impact trades\n\n${impact.checks.filter(c => c.impactLevel !== "low").slice(0, 3).map(c => `- ${c.symbol}: ${(c.impactRatio * 100).toFixed(3)}% of daily vol (${(c.tradeValueNok / 1_000_000).toFixed(1)}M NOK)`).join("\n")}`,
        }),
      });
    }

    return NextResponse.json(impact);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
