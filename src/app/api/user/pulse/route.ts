import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user/pulse — pulse-dashboard: daglige metrikker (chart),
 * siste handler (events) og aktiv sesjon (stats).
 *
 * KLA-auth: usePulseData leste auto_trading_daily_metrics / trades /
 * trading_sessions via browser-supabase (alltid anon → stille 0 rader).
 * Kolonner verifisert mot information_schema 2026-07-24.
 */
export async function GET(_request: NextRequest) {
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

    const [metricsRes, tradesRes, sessionRes] = await Promise.all([
      supabase
        .from("auto_trading_daily_metrics")
        .select("date, ending_capital_nok")
        .eq("user_id", user.id)
        .order("date", { ascending: true }),
      supabase
        .from("trades")
        .select("id, created_at, side, trading_pair, price, quantity")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("trading_sessions")
        .select("current_capital_nok, initial_capital, total_pnl")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      metrics: metricsRes.data ?? [],
      trades: tradesRes.data ?? [],
      session: sessionRes.data ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
