/**
 * POST /api/ai/autopilot/pause
 * Pauser autopiloten — stopper alle aktive paper-sessions.
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

    // Pause autopilot config
    await db
      .from("ai_autopilot_configs")
      .update({ status: "paused", updated_at: now })
      .eq("user_id", user.id);

    // Stop all active paper sessions
    await db
      .from("trading_sessions")
      .update({
        status: "paused",
        last_status_message: "Autopilot paused by user",
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .eq("status", "active");

    return NextResponse.json({ ok: true, message: "Autopilot paused" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
