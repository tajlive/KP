/**
 * Keepalive Cron Job
 *
 * Kjører hver 5. dag kl 06:00 UTC for å holde Supabase-prosjektet aktivt.
 * Dette forhindrer at prosjektet går i "idle"-modus etter 7 dager uten aktivitet.
 *
 * Schedule: 0 6 every-5-days (hver 5. dag kl 06:00 UTC)
 * Auth: Krever CRON_SECRET header
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verifiser CRON_SECRET for å beskytte mot uautorisert aksess
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret) {
      const bearerToken = authHeader?.replace("Bearer ", "");
      if (bearerToken !== expectedSecret) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
    }

    const supabase = createClient();
    // Hent database-navn fra connection
    const { data: dbInfo, error: dbError } = await (supabase as unknown as { rpc: (name: string, params?: Record<string, unknown>) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } }).rpc("current_database_name").single();

    // Enkel query for å holde tilkoblingen aktiv
    const { error } = await supabase
      .from("user_profiles")
      .select("count", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const timestamp = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      ts: timestamp,
      db: dbInfo || "klarpakke",
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
