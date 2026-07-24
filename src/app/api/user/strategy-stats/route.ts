import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/user/strategy-stats?session_id=<uuid> — avansert statistikk:
 * fylte handler (stigende, til drawdown-beregning), signaler og backtests.
 *
 * KLA-auth: AdvancedStatsModal leste trades / signals /
 * auto_trading_backtests via browser-supabase (alltid anon → stille 0
 * rader). Statistikkberegningen skjer fortsatt klient-side.
 * Kolonner verifisert mot information_schema 2026-07-24.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig session_id" },
        { status: 400 },
      );
    }

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

    const [tradesRes, signalsRes, backtestsRes] = await Promise.all([
      supabase
        .from("trades")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .in("status", ["filled"])
        .order("executed_at", { ascending: true }),
      supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("auto_trading_backtests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      ok: true,
      trades: tradesRes.data ?? [],
      signals: signalsRes.data ?? [],
      backtests: backtestsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
