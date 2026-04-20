/**
 * Cron: Update USDT/NOK rate in global_settings (USDT ≈ USD).
 * Call daily from Vercel Cron or external scheduler.
 * Secured with CRON_SECRET.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(EXCHANGE_RATE_URL, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Exchange API ${res.status}`);
    const data = (await res.json()) as { rates?: { NOK?: number } };
    const usdToNok = data.rates?.NOK;
    if (typeof usdToNok !== "number" || usdToNok <= 0) {
      throw new Error("Invalid NOK rate");
    }

    const supabase = createClient();
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
