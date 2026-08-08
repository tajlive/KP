import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio/chart?mode=paper&days=30&sessionId=<uuid>
 *
 * Datakilde for PortfolioChart. MÅ gå via server: auth-cookien er httpOnly,
 * saa browser-klienten kjorer som anon og RLS gir 0 rader (grafen lo
 * "Ingen handelshistorikk" for alle brukere). Her leser server-klienten
 * cookien og vi filtrerer eksplisitt pa user.id (service role).
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = NextResponse.next();
    const authClient = createServerClient(request, authResponse);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mode =
      request.nextUrl.searchParams.get("mode") === "live" ? "live" : "paper";
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const daysParam = parseInt(
      request.nextUrl.searchParams.get("days") || "30",
      10,
    );
    const days = Number.isFinite(daysParam)
      ? Math.min(Math.max(daysParam, 1), 365)
      : 30;

    const supabase = createClient();

    let sessionQuery = supabase
      .from("trading_sessions")
      .select("id, starting_capital_nok, current_capital_nok, open_position, started_at")
      .eq("user_id", user.id);

    if (sessionId) {
      // Eierskap tvunget via user_id-filteret over.
      sessionQuery = sessionQuery.eq("id", sessionId);
    } else {
      // Alle ikke-arkiverte sesjoner — ellers forsvinner handelshistorikken
      // naar sesjoner stoppes, og grafen lyver "Ingen handler".
      sessionQuery = sessionQuery
        .eq("mode", mode)
        .is("archived", false)
        .order("updated_at", { ascending: false });
    }

    const { data: sessions, error: sessionError } = await sessionQuery;

    if (sessionError) {
      console.error(
        "[GET /api/portfolio/chart] session error:",
        sessionError.code,
        sessionError.message,
      );
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 },
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [], trades: [], accountStart: null });
    }

    // Anker startkapital til paper_accounts (source of truth for saldo).
    // FIKS 3: Inkluderer current_balance for overskrifts-KPI.
    // FIKS 8: investedCapital beregnes fra åpne posisjoner (samme logikk som
    // getAccountBalance) — «Total verdi» = ledig + investert overalt, og
    // avkastnings-% = EKTE trading-P&L (totalPnl), ikke konto-differansen.
    let accountStart: number | null = null;
    let accountBalance: number | null = null;
    let investedCapital = 0;
    if (mode === "paper" && !sessionId) {
      const { data: account } = await supabase
        .from("paper_accounts")
        .select("initial_balance, current_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      accountStart =
        account?.initial_balance != null ? Number(account.initial_balance) : null;
      accountBalance =
        account?.current_balance != null ? Number(account.current_balance) : null;
    }
    if (mode === "paper" && !sessionId && sessions && sessions.length > 0) {
      for (const s of sessions) {
        const pos = s.open_position as { quantity?: number; entry_price?: number } | null;
        if (pos?.quantity && pos?.entry_price) {
          investedCapital += pos.quantity * pos.entry_price;
        }
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessionIds = sessions.map((s) => s.id);
    const CHUNK_SIZE = 500;
    let allTrades: Array<{
      created_at: string;
      realized_pnl: number | null;
      side: string;
      total_value: number;
    }> = [];

    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("created_at, realized_pnl, side, total_value")
        .in("session_id", chunk)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (tradesError) {
        console.error(
          "[GET /api/portfolio/chart] trades error:",
          tradesError.code,
          tradesError.message,
        );
        continue;
      }
      if (trades) {
        allTrades = allTrades.concat(trades);
      }
    }

    // FIKS 8: EKTE trading-P&L = SUM(realized_pnl) over ALLE trades (all-time),
    // uavhengig av valgt graf-periode — header-en sier «siden start» og må matche
    // «Total avkastning»-kortet (RPC get_dashboard_metrics). Konto-differansen
    // (current_balance − initial_balance) inkluderer manuelle justeringer og
    // lyver som «avkastning» — aldri bruk den som P&L.
    let totalPnl = 0;
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
      const { data: pnlRows } = await supabase
        .from("trades")
        .select("realized_pnl")
        .in("session_id", chunk);
      for (const row of pnlRows ?? []) {
        if (typeof row.realized_pnl === "number") totalPnl += row.realized_pnl;
      }
    }

    return NextResponse.json({
      sessions,
      trades: allTrades,
      accountStart,
      accountBalance,
      investedCapital,
      totalPnl,
    });
  } catch (err) {
    console.error("[GET /api/portfolio/chart] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
