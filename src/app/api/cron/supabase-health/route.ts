/**
 * API Route: /api/cron/supabase-health
 * Kjører health check og returnerer status
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function POST(request: NextRequest) {
  // Verifiser cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  try {
    // Test DB connection
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("bot_health").select("id").limit(1);

    const latency = Date.now() - start;

    if (error) {
      return NextResponse.json(
        { ok: false, latency_ms: latency, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      latency_ms: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latency = Date.now() - start;
    return NextResponse.json(
      {
        ok: false,
        latency_ms: latency,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
