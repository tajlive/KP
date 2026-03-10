/**
 * Keepalive Cron Job
 * 
 * Kjører hver 5. dag kl 06:00 UTC for å holde Supabase-prosjektet aktivt.
 * Dette forhindrer at prosjektet går i "idle"-modus etter 7 dager uten aktivitet.
 * 
 * Schedule: 0 6 every-5-days (hver 5. dag kl 06:00 UTC)
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Enkel query for å holde tilkoblingen aktiv
    const { data, error } = await supabase
      .from("user_profiles")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Keepalive query failed:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`[Keepalive] Ping successful at ${timestamp}`);

    return NextResponse.json({
      ok: true,
      timestamp,
      profileCount: data?.length ?? 0,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("Keepalive failed:", error);
    
    return NextResponse.json(
      { ok: false, error },
      { status: 500 }
    );
  }
}
