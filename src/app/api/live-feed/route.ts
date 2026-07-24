import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/live-feed?limit=<n> — sosial feed: siste live-handler på
 * plattformen + antall aktive live-tradere.
 *
 * KLA-auth: LiveTradeFeed leste trades/user_profiles/trading_sessions via
 * browser-supabase (alltid anon → stille 0 rader). Krever innlogging
 * (dashboard-widget). Viser display_name med fallback "Trader".
 * Kolonner verifisert mot information_schema 2026-07-24.
 */
export async function GET(request: NextRequest) {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Ikke autentisert" },
        { status: 401 },
      );
    }

    const limitParam = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "10",
      10,
    );
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitParam) ? limitParam : 10));

    const { data: tradesData, error: tradesError } = await supabase
      .from("trades")
      .select("id, user_id, trading_pair, side, realized_pnl, created_at, mode")
      .eq("mode", "live")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tradesError) {
      return NextResponse.json(
        { ok: false, error: tradesError.message },
        { status: 500 },
      );
    }

    const rows = tradesData ?? [];
    const userIds = [...new Set(rows.map((t) => t.user_id).filter(Boolean))];

    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, full_name")
        .in("user_id", userIds);
      profileMap = new Map(
        (profiles ?? []).map((p) => [
          p.user_id as string,
          (p.display_name || p.full_name || "Trader") as string,
        ]),
      );
    }

    const { count: activeCount } = await supabase
      .from("trading_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("mode", "live");

    return NextResponse.json({
      ok: true,
      trades: rows.map((t) => ({
        id: t.id,
        userName: profileMap.get(t.user_id as string) ?? "Trader",
        symbol: t.trading_pair,
        side: t.side,
        pnl: Number(t.realized_pnl) || 0,
        created_at: t.created_at,
      })),
      activeTraders: activeCount ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
