import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio/summary
 *
 * Samlet data til porteføljesiden. Saldo hentes fra paper_accounts
 * (source of truth — IKKE sum av sesjoner, se migrasjon
 * 20260724120000_fix_balance_sync_direction). Posisjoner aggregeres
 * fra filled paper-trades: netto mengde + vektet snittkjøpspris per symbol.
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

    const supabase = createClient();

    // Statistikk: ikke-arkiverte sesjoner (samme scope som grafen).
    const { data: sessions } = await supabase
      .from("trading_sessions")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .is("archived", false);

    const sessionIds = (sessions ?? []).map((s) => s.id);
    // Posisjoner: kun aktive/pausete sesjoner — stoppete sesjoner er
    // avviklet; a aggregere "apne" beholdninger fra dem gir fantom-
    // posisjoner (og gamle handler kan ha enhetsfeil i pris).
    const liveSessionIds = (sessions ?? [])
      .filter((s) => s.status === "active" || s.status === "paused")
      .map((s) => s.id);

    const [accountRes, tradesRes, openTradesRes] = await Promise.all([
      supabase
        .from("paper_accounts")
        .select("current_balance, initial_balance")
        .eq("user_id", user.id)
        .maybeSingle(),
      sessionIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("trades")
            .select("trading_pair, side, quantity, price, total_value, realized_pnl")
            .eq("user_id", user.id)
            .eq("mode", "paper")
            .eq("status", "filled")
            .in("session_id", sessionIds),
      liveSessionIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("trades")
            .select("trading_pair, side, quantity, price, total_value, realized_pnl")
            .eq("user_id", user.id)
            .eq("mode", "paper")
            .eq("status", "filled")
            .in("session_id", liveSessionIds),
    ]);

    if (tradesRes.error) {
      console.error(
        "[GET /api/portfolio/summary] trades error:",
        tradesRes.error.code,
        tradesRes.error.message,
      );
      return NextResponse.json(
        { error: tradesRes.error.message },
        { status: 500 },
      );
    }

    const trades = tradesRes.data ?? [];
    const openTrades = openTradesRes.data ?? [];

    // Statistikk over hele (ikke-arkiverte) historikken.
    let totalPnl = 0;
    let closedCount = 0;
    let winCount = 0;
    for (const t of trades) {
      if (t.realized_pnl != null) {
        totalPnl += Number(t.realized_pnl);
        closedCount += 1;
        if (Number(t.realized_pnl) > 0) winCount += 1;
      }
    }

    // Posisjoner kun fra aktive/pausete sesjoner.
    const positionsMap = new Map<
      string,
      { symbol: string; tradingPair: string; qty: number; costBasis: number }
    >();

    for (const t of openTrades) {
      const pair = t.trading_pair || "UKJENT";
      const key = pair.replace("/", "");
      const qty = Number(t.quantity) || 0;
      const price = Number(t.price) || 0;
      const entry = positionsMap.get(key) ?? {
        symbol: key.replace(/USDT$/, ""),
        tradingPair: pair,
        qty: 0,
        costBasis: 0,
      };

      if (t.side === "buy") {
        // Vektet snittpris for aa beregne urealisert P&L i klienten.
        entry.costBasis += qty * price;
        entry.qty += qty;
      } else {
        // Reduser kostnadsgrunnlaget proporsjonalt ved salg.
        const sellRatio = entry.qty > 0 ? Math.min(qty / entry.qty, 1) : 0;
        entry.costBasis -= entry.costBasis * sellRatio;
        entry.qty = Math.max(entry.qty - qty, 0);
      }
      positionsMap.set(key, entry);
    }

    const positions = [...positionsMap.values()]
      .filter((p) => p.qty > 1e-10)
      .map((p) => ({
        symbol: p.symbol,
        tradingPair: p.tradingPair,
        qty: p.qty,
        avgBuyPrice: p.qty > 0 ? p.costBasis / p.qty : 0,
      }))
      .sort((a, b) => b.qty * b.avgBuyPrice - a.qty * a.avgBuyPrice);

    return NextResponse.json({
      balance:
        accountRes.data?.current_balance != null
          ? Number(accountRes.data.current_balance)
          : null,
      initialBalance:
        accountRes.data?.initial_balance != null
          ? Number(accountRes.data.initial_balance)
          : null,
      totalTrades: trades.length,
      closedTrades: closedCount,
      winRate: closedCount > 0 ? winCount / closedCount : null,
      totalPnl,
      positions,
    });
  } catch (err) {
    console.error("[GET /api/portfolio/summary] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
