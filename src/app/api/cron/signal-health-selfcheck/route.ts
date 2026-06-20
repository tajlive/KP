import { NextRequest, NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/auth/cron";
import { getServiceRoleClient } from "@/lib/api-auth";
import { DATA_SOURCE_THRESHOLDS } from "@/lib/trading/data-source-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleThreshold =
    Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES) ||
    DATA_SOURCE_THRESHOLDS.staleMinutes;

  try {
    const supabase = getServiceRoleClient();
    const { data: botRow, error } = await supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status, metadata")
      .eq("bot_name", "signal-engine")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, reason: "bot_health_read_failed", error: error.message },
        { status: 500 },
      );
    }

    const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;
    const heartbeatAgeMinutes = heartbeatAt
      ? (Date.now() - new Date(heartbeatAt).getTime()) / 60000
      : null;

    if (
      heartbeatAgeMinutes != null &&
      heartbeatAgeMinutes <= staleThreshold &&
      botRow?.status !== "error"
    ) {
      return NextResponse.json({
        ok: true,
        healed: false,
        heartbeatAgeMinutes: Number(heartbeatAgeMinutes.toFixed(2)),
        staleThresholdMinutes: staleThreshold,
        reason: "already_healthy",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          healed: false,
          reason: "missing_env",
          message:
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
        },
        { status: 500 },
      );
    }

    const invokeRes = await fetch(
      `${baseUrl.replace(/\/$/, "")}/functions/v1/signal-engine`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const { data: afterRow } = await supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status")
      .eq("bot_name", "signal-engine")
      .maybeSingle();

    const afterAt = afterRow?.last_heartbeat ?? afterRow?.updated_at ?? null;
    const afterAgeMinutes = afterAt
      ? (Date.now() - new Date(afterAt).getTime()) / 60000
      : null;
    const healed =
      afterAgeMinutes != null &&
      afterAgeMinutes <= staleThreshold &&
      afterRow?.status !== "error";

    return NextResponse.json(
      {
        ok: healed,
        healed,
        reason: healed ? "healed_by_invoke" : "still_stale_after_invoke",
        staleThresholdMinutes: staleThreshold,
        beforeHeartbeatAgeMinutes:
          heartbeatAgeMinutes == null
            ? null
            : Number(heartbeatAgeMinutes.toFixed(2)),
        afterHeartbeatAgeMinutes:
          afterAgeMinutes == null ? null : Number(afterAgeMinutes.toFixed(2)),
        invokeStatus: invokeRes.status,
      },
      { status: healed ? 200 : 503 },
    );
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
