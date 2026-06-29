import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
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
  const parsed = paramsSchema.safeParse({ mode: searchParams.get("mode") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const { mode } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  const metrics = await getUserDashboardMetrics({
    supabaseClient: supabase,
    userId: user.id,
    mode,
    sessionScope: "all",
  });

  return NextResponse.json(
    { metrics },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
