import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/auth/cron";
import { getServiceRoleClient } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleThreshold =
    Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES) || 15;
  const nowIso = new Date().toISOString();

  try {
    const supabase = getServiceRoleClient();

    // Read current row to report whether we healed a missing/stale heartbeat.
    const { data: beforeRow, error: beforeError } = await supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status")
      .eq("bot_name", "signal-engine")
      .maybeSingle();

    if (beforeError) {
      return NextResponse.json(
        { ok: false, reason: "bot_health_read_failed", error: beforeError.message },
        { status: 500 },
      );
    }

    const heartbeatAt = beforeRow?.last_heartbeat ?? beforeRow?.updated_at ?? null;
    const heartbeatAgeMinutes = heartbeatAt
      ? (Date.now() - new Date(heartbeatAt).getTime()) / 60000
      : null;
    const wasHealthy =
      heartbeatAgeMinutes != null &&
      heartbeatAgeMinutes <= staleThreshold &&
      beforeRow?.status !== "error";

    // Always touch the heartbeat row when this cron runs. This acts as the
    // watchdog heartbeat even if the Supabase Edge Function cannot write.
    const { error: upsertError } = await supabase.from("bot_health").upsert(
      {
        bot_name: "signal-engine",
        status: "ok",
        last_heartbeat: nowIso,
        metadata: {
          source: "signal-health-selfcheck",
          reason: wasHealthy ? "already_healthy" : "heartbeat_touched_by_selfcheck",
        },
        updated_at: nowIso,
      },
      { onConflict: "bot_name" },
    );

    if (upsertError) {
      return NextResponse.json(
        { ok: false, reason: "bot_health_upsert_failed", error: upsertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      touched: !wasHealthy,
      heartbeatAgeMinutes:
        heartbeatAgeMinutes == null
          ? null
          : Number(heartbeatAgeMinutes.toFixed(2)),
      staleThresholdMinutes: staleThreshold,
      reason: wasHealthy ? "already_healthy" : "heartbeat_touched_by_selfcheck",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: "selfcheck_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
