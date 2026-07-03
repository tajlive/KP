// Public/authenticated API: fetch the latest trader verification status.

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VerificationRecord {
  status: string;
  reason?: string | null;
  verified_by?: string | null;
  created_at?: string | null;
}

export const GET = withAuth(async (req: NextRequest) => {
  const trader_profile_id = req.nextUrl.pathname.split("/").pop() ?? "";

  if (!UUID_RE.test(trader_profile_id)) {
    return NextResponse.json(
      { error: "Invalid trader_profile_id" },
      { status: 400 },
    );
  }

  const db = createClient();

  const { data, error } = await db.rpc(
    "latest_trader_verification" as Parameters<typeof db.rpc>[0],
    {
      p_trader_profile_id: trader_profile_id,
    } as Parameters<typeof db.rpc>[1],
  );

  if (error) {
    console.error(
      "[trader-verifications] latest_trader_verification:",
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to fetch verification status" },
      { status: 500 },
    );
  }

  const records = Array.isArray(data) ? data : [];
  const verification = records[0] as VerificationRecord | undefined;

  if (!verification) {
    return NextResponse.json(
      { error: "No verification found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    status: verification.status,
    reason: verification.reason ?? undefined,
    verified_by: verification.verified_by ?? undefined,
    created_at: verification.created_at ?? undefined,
  });
});
