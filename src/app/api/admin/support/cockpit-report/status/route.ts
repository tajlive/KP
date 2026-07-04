import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["queued", "running", "done", "failed"] as const;

type ReportStatus = (typeof VALID_STATUSES)[number];





const statusSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * Admin: poll the status of a cockpit screenshot report job.
 * Returns the signed URL once the worker has uploaded the report.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = statusSchema.safeParse({
    jobId: searchParams.get("jobId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobId } = parsed.data;

  try {
    const db = createServiceClient();

    const { data: job, error: fetchErr } = await db
      .from("cockpit_report_jobs")
      .select("id, status, signed_url, expires_at, admin_user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[admin cockpit-report/status] fetch failed:", fetchErr);
      return NextResponse.json(
        { error: fetchErr.message },
        { status: 500 },
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: "Report job not found" },
        { status: 404 },
      );
    }

    if (job.admin_user_id !== auth.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const response: {
      ok: true;
      jobId: string;
      status: ReportStatus;
      url?: string;
      expiresAt?: string;
    } = {
      ok: true,
      jobId: job.id,
      status: job.status as ReportStatus,
    };

    if (job.signed_url) {
      response.url = job.signed_url;
    }
    if (job.expires_at) {
      response.expiresAt = job.expires_at;
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error("[admin cockpit-report/status]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
