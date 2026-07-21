import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateAdverseSelection } from "@/lib/trading/adverse-selection";
import { validateCronSecret } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const adverse = await calculateAdverseSelection(supabase, 24);

    if (adverse.overall.alertTriggered && process.env.SLACK_WEBHOOK) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(process.env.SLACK_WEBHOOK, {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ text: `🚨 *Adverse Selection Alert* — ${adverse.overall.adverseSelectionPct.toFixed(1)}% adverse` }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json(adverse);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export const POST = GET;
