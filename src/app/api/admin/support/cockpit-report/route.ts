import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().uuid(),
});

const VALID_STATUSES = ["queued", "running", "done", "failed"] as const;

type ReportStatus = (typeof VALID_STATUSES)[number];





/**
 * Admin: queue a cockpit screenshot report for a target user.
 * The actual screenshot run is performed by a GitHub Actions worker that
 * writes the resulting signed URL back to cockpit_report_jobs.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId: target_user_id } = parsed.data;
  const status: ReportStatus = "queued";

  try {
    const db = createServiceClient();

    const { data: targetUser, error: targetErr } = await db
      .from("user_profiles")
      .select("id")
      .eq("id", target_user_id)
      .maybeSingle();

    if (targetErr || !targetUser) {
      return NextResponse.json(
        { error: "Target user profile not found" },
        { status: 404 },
      );
    }

    const { data: job, error: insertErr } = await db
      .from("cockpit_report_jobs")
      .insert({
        admin_user_id: auth.userId,
        target_user_id,
        status,
      })
      .select("id, status")
      .single();

    if (insertErr || !job) {
      console.error("[admin cockpit-report] insert failed:", insertErr);
      return NextResponse.json(
        { error: insertErr?.message ?? "Failed to create report job" },
        { status: 500 },
      );
    }

    await logAdminAudit(db, {
      admin_user_id: auth.userId,
      action: "cockpit_report",
      target_user_id,
      payload: {
        job_id: job.id,
        status: job.status,
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      status: job.status as ReportStatus,
    });
  } catch (e) {
    console.error("[admin cockpit-report]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
