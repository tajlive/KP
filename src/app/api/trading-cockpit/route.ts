import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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

  return NextResponse.json({
    ok: true,
    endpoints: [
      "/api/trading-cockpit/metrics",
      "/api/trading-cockpit/sessions",
      "/api/trading-cockpit/trades",
      "/api/trading-cockpit/analytics",
    ],
  });
}
