/**
 * Cron: Transaction Cost Analysis (TCA) Report
 * Generates execution quality metrics for the trading period.
 * Alerts Slack if slippage or cost exceeds thresholds.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateTCA, type TCAMetrics } from "@/lib/trading/tca";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SLIPPAGE_ALERT_BPS = 20;
const COST_ALERT_PCT = 0.15; // 0.15% of volume

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const metrics = await calculateTCA(supabase, 24);

    const alerts: string[] = [];
    if (metrics.execution.avgSlippageBps > SLIPPAGE_ALERT_BPS) {
      alerts.push(`Slippage ${metrics.execution.avgSlippageBps.toFixed(1)} bps > ${SLIPPAGE_ALERT_BPS} bps threshold`);
    }
    if (metrics.totals.costPctOfVolume > COST_ALERT_PCT) {
      alerts.push(`Cost ${metrics.totals.costPctOfVolume.toFixed(3)}% > ${COST_ALERT_PCT}% threshold`);
    }

    if (alerts.length > 0 && process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ *TCA Alert* — ${metrics.period.hours}h\n\n${alerts.join("\n")}\n\nTrades: ${metrics.totals.totalTrades} | Cost: ${metrics.totals.totalCostNok.toFixed(0)} NOK (${metrics.totals.costPctOfVolume.toFixed(3)}%) | Avg slippage: ${metrics.execution.avgSlippageBps.toFixed(1)} bps`,
        }),
      });
    }

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("[trading-tca] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = GET;
