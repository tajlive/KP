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
      .select("id, starting_capital_nok, current_capital_nok, started_at")
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
    let accountStart: number | null = null;
    let accountBalance: number | null = null;
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

    return NextResponse.json({ sessions, trades: allTrades, accountStart, accountBalance });
  } catch (err) {
    console.error("[GET /api/portfolio/chart] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
