import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/user/trading-logs?session_id=<uuid> — statuslogger + last_tick_at.
 *
 * KLA-auth: TraderStatusLog leste trading_logs/trading_sessions via
 * browser-supabase (alltid anon → stille 0 rader).
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

    const [logsRes, sessionRes] = await Promise.all([
      supabase
        .from("trading_logs")
        .select("action, details, created_at")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .in("action", ["regime_signal", "trade_executed", "live_trade_failed"])
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("trading_sessions")
        .select("last_tick_at")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      logs: logsRes.data ?? [],
      lastTickAt: sessionRes.data?.last_tick_at ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
