import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    mode: searchParams.get("mode"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { mode, limit } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  const { data: sessions, error } = await supabase
    .from("trading_sessions")
    .select(
      "id, status, mode, starting_capital_nok, current_capital_nok, total_pnl, trading_pair, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[trading-cockpit/sessions]", error);
    return NextResponse.json(
      { error: "Could not fetch sessions" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { sessions: sessions ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
