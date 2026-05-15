import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePLAttribution } from "@/lib/trading/pl-attribution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const attr = await calculatePLAttribution(supabase, 24);

    if (process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `📊 *P&L Attribution (24h)* — Total: ${attr.totalPnLNok.toFixed(0)} NOK\n\n• Alpha (skill): ${attr.attribution.alpha.toFixed(0)} NOK\n• Market Beta: ${attr.attribution.marketBeta.toFixed(0)} NOK\n• Currency Drift: ${attr.attribution.currencyDrift.toFixed(0)} NOK\n• Execution: ${attr.attribution.executionQuality.toFixed(0)} NOK\n\nSharpe: ${attr.metrics.sharpeRatio.toFixed(2)} | Alpha%: ${attr.metrics.alphaPct.toFixed(1)}% | Info Ratio: ${attr.metrics.informationRatio.toFixed(2)}`,
        }),
      });
    }

    return NextResponse.json(attr);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
