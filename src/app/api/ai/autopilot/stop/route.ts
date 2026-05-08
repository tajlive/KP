/**
 * POST /api/ai/autopilot/stop
 * Stopper autopiloten permanent — lukker alle posisjoner.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const db = createServerClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Stop autopilot config
    await db
      .from("ai_autopilot_configs")
      .update({ status: "stopped", updated_at: now })
      .eq("user_id", user.id);

    // Stop all paper sessions
    await db
      .from("trading_sessions")
      .update({
        status: "stopped",
        last_status_message: "Autopilot stopped by user",
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .in("status", ["active", "paused"]);

    return NextResponse.json({ ok: true, message: "Autopilot stopped" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
