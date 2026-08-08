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
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(25),
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
    limit: searchParams.get("limit") || undefined,
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
    cursor,
    limit,
    status,
    sessionStatus,
    side,
    pair,
    search,
    from,
    to,
  } = parsed.data;

  if (mode === "live" && !(await verifyLiveEntitlement(supabase, user.id))) {
    return NextResponse.json(
      { error: "Live trading not available" },
      { status: 403 },
    );
  }

  const { data: rows, error } = await supabase.rpc("get_trades_paginated", {
    p_user_id: user.id,
    // NULL = "alle" (funksjonen tester IS NULL). Tom streng kaster 22007
    // (timestamptz) / 22P02 (enum); tom array gjør ANY('{}')=false → 0 rader.
    // Fikset 2026-08-08: alle valgfrie parametere sendes som null når ikke satt.
    p_cursor: (cursor || null) as unknown as string,
    p_limit: limit,
    p_mode: mode,
    p_trade_statuses: (status?.length ? (status as string[]) : null) as unknown as string[],
    p_session_statuses: (sessionStatus?.length ? (sessionStatus as string[]) : null) as unknown as string[],
    p_side: (side || null) as unknown as string,
    p_pair: (pair || null) as unknown as string,
    p_search: (search || null) as unknown as string,
    p_from: (from || null) as unknown as string,
    p_to: (to || null) as unknown as string,
  });

  if (error) {
    console.error("[trading-cockpit/trades]", error);
    return NextResponse.json(
      { error: "Could not fetch trades" },
      { status: 500 },
    );
  }

  const trades = rows ?? [];
  const hasMore = trades.length > limit;
  const trimmed = hasMore ? trades.slice(0, limit) : trades;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].next_cursor : null;

  return NextResponse.json(
    { trades: trimmed, next_cursor: nextCursor },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
