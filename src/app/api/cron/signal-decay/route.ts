import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateSignalDecay } from "@/lib/trading/signal-decay";
import { validateCronSecret } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const decay = await calculateSignalDecay(supabase, 24);

    if (decay.overallAccuracyPct < 50 && process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ *Signal Decay Alert* — Overall accuracy ${decay.overallAccuracyPct.toFixed(1)}%\n\n${decay.buckets.map(b => `- ${b.bucketLabel}: ${b.accuracyPct.toFixed(1)}% (${b.trades} trades)`).join("\n")}\n\nOptimal window: <${decay.optimalWindowMs}ms`,
        }),
      });
    }

    return NextResponse.json(decay);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
