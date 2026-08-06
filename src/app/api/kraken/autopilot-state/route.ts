/**
 * GET /api/kraken/autopilot-state — brukerens autopilot-tilstand (Task E1).
 * Leser fra autopilot_state-tabellen. Kun egen rad (RLS).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("autopilot_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.activated) return NextResponse.json({ activated: false });

  return NextResponse.json(data);
}
