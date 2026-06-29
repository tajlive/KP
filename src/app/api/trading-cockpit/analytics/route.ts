import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import { z } from "zod";

const isoOrNull = z
  .string()
  .datetime()
  .or(z.literal(""))
  .optional()
  .nullable();

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
  status: z
    .enum(["filled", "partially_filled", "pending", "cancelled", "failed"])
    .array()
    .optional(),
  sessionStatus: z
    .enum(["active", "paused", "stopped", "crashed"])
    .array()
    .optional(),
  side: z.enum(["buy", "sell"]).optional().nullable(),
  pair: z.string().max(50).optional().nullable(),
  search: z.string().max(100).optional().nullable(),
  from: isoOrNull,
  to: isoOrNull,
});

function periodToRange(period: string): {
  from: string | null;
  to: string | null;
} {
  const now = new Date();
  const to = now.toISOString();
  const map: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  if (period === "all") return { from: null, to: null };
  const days = map[period] ?? 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

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
    period: searchParams.get("period") || "30d",
    status: searchParams.getAll("status"),
    sessionStatus: searchParams.getAll("sessionStatus"),
    side: searchParams.get("side") || null,
    pair: searchParams.get("pair") || null,
    search: searchParams.get("search") || null,
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    mode,
    period,
    status,
    sessionStatus,
    side,
    pair,
    search,
  } = parsed.data;
  let { from, to } = parsed.data;

  if (!from || !to) {
    const range = periodToRange(period);
    from = range.from;
    to = range.to;
  }

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  const { data: analytics, error } = await supabase.rpc(
    "get_trading_analytics",
    {
      p_user_id: user.id,
      p_mode: mode,
      p_trade_statuses: status?.length ? status : null,
      p_session_statuses: sessionStatus?.length ? sessionStatus : null,
      p_side: side,
      p_pair: pair,
      p_search: search,
      p_from: from,
      p_to: to,
    },
  );

  if (error) {
    console.error("[trading-cockpit/analytics]", error);
    return NextResponse.json(
      { error: "Could not fetch analytics" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { analytics },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
