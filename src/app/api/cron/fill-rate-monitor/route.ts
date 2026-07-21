import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateFillRate } from "@/lib/trading/fill-rate-monitor";
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
    const metrics = await calculateFillRate(supabase, 24);

    if (metrics.overall.fillRatePct < 95 && process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, , { signal: controller.signal }
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ *Fill Rate Alert* — ${metrics.overall.fillRatePct.toFixed(1)}% fill rate (${metrics.overall.partialFillCount}/${metrics.overall.totalTrades} partial)\n\nWorst symbols:\n${metrics.bySymbol.slice(0, 3).map(s => `- ${s.symbol}: ${s.fillRatePct.toFixed(1)}% fill, ${s.impactNok.toFixed(0)} NOK impact`).join("\n")}`,
        }),
      });
    }

    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
