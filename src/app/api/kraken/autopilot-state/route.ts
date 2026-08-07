/**
 * GET /api/kraken/autopilot-state — brukerens autopilot-tilstand
 * Auth: Supabase cookie eller Bearer JWT (withAuth).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("autopilot_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.activated) return NextResponse.json({ activated: false });

  return NextResponse.json(data);
});
