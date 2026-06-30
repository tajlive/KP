import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import type { TradingSessionSummary } from "@/features/trading-cockpit/types";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]),
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const SESSION_SELECT = [
  "id",
  "status",
  "mode",
  "starting_capital_nok",
  "current_capital_nok",
  "total_pnl",
  "trading_pair",
  "created_at",
  "updated_at",
].join(", ");

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
    cursor: searchParams.get("cursor") || null,
    limit: searchParams.get("limit"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { mode, cursor, limit } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  let cursorCreatedAt: string | null = null;
  if (cursor) {
    const { data: cursorRow, error: cursorError } = await supabase
      .from("trading_sessions")
      .select("created_at")
      .eq("id", cursor)
      .eq("user_id", user.id)
      .single();

    if (cursorError || !cursorRow) {
      return NextResponse.json(
        { error: "Invalid cursor" },
        { status: 400 },
      );
    }

    cursorCreatedAt = cursorRow.created_at;
  }

  let query = supabase
    .from("trading_sessions")
    .select(SESSION_SELECT)
    .eq("user_id", user.id)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursorCreatedAt) {
    // Supabase JS typing treats the composite or-filter as a generic string error,
    // which poisons the selected row type. Cast back to the query builder so
    // .returns<TradingSessionSummary[]>() can narrow the result below.
    query = (query as typeof query).or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursor})`,
    );
  }

  const { data: sessions, error } = await query
    .limit(limit + 1)
    .returns<TradingSessionSummary[]>();

  if (error) {
    console.error("[trading-cockpit/sessions]", error);
    return NextResponse.json(
      { error: "Could not fetch sessions" },
      { status: 500 },
    );
  }

  const rows = sessions ?? [];
  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return NextResponse.json(
    { sessions: trimmed, nextCursor, hasMore },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
