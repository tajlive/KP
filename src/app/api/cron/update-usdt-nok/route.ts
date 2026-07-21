/**
 * Cron: Update USDT/NOK rate in global_settings (USDT ≈ USD).
 * Call daily from Supabase pg_cron, Cloudflare cron, or another authorized scheduler.
 * Secured with CRON_SECRET.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD";

export async function GET(req: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(EXCHANGE_RATE_URL, { next: { revalidate: 0 } }), { signal: controller.signal }
  clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Exchange API ${res.status}`);
    const data = (await res.json()) as { rates?: { NOK?: number } };
    const usdToNok = data.rates?.NOK;
    if (typeof usdToNok !== "number" || usdToNok <= 0) {
      throw new Error("Invalid NOK rate");
    }

    // Validate rate is within reasonable bounds (protects against corrupt API data)
    if (usdToNok < 5 || usdToNok > 20) {
      throw new Error(`Rate ${usdToNok} is outside reasonable bounds (5–20 NOK/USD)`);
    }

    const supabase = createClient();

    // Fetch previous rate for change detection
    const { data: previous } = await supabase
      .from("global_settings")
      .select("usdt_nok_rate")
      .eq("id", 1)
      .maybeSingle();

    const previousRate = previous?.usdt_nok_rate ? Number(previous.usdt_nok_rate) : null;
    const changePercent = previousRate ? ((usdToNok - previousRate) / previousRate) * 100 : null;

    // Reject if rate changed >10% in one day (indicates corrupt data)
    if (changePercent !== null && Math.abs(changePercent) > 10) {
      console.error(`[update-usdt-nok] REJECTED: ${previousRate} → ${usdToNok} (${changePercent.toFixed(2)}% change)`);
      return NextResponse.json(
        { error: `Rate change ${changePercent.toFixed(2)}% exceeds 10% threshold`, previousRate, newRate: usdToNok },
        { status: 422 }
      );
    }

    // Warn if rate changed >5% (unusual but possible)
    if (changePercent !== null && Math.abs(changePercent) > 5) {
      console.warn(`[update-usdt-nok] UNUSUAL: ${previousRate} → ${usdToNok} (${changePercent.toFixed(2)}% change)`);
    }

    const { error } = await supabase
      .from("global_settings")
      .update({
        usdt_nok_rate: usdToNok,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("[update-usdt-nok]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usdt_nok_rate: usdToNok,
      previous_rate: previousRate,
      change_percent: changePercent,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[update-usdt-nok]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
