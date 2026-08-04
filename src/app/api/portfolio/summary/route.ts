import { createServerClient, createClient } from "@/lib/supabase/server";
import {
  cleanTradeStats,
  getCleanTrades,
  type CleanTrade,
} from "@/lib/trading/clean-trades";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolio/summary
 *
 * Samlet data til porteføljesiden. Saldo hentes fra paper_accounts
 * (source of truth — IKKE sum av sesjoner, se migrasjon
 * 20260724120000_fix_balance_sync_direction). Posisjoner aggregeres
 * fra filled paper-trades: netto mengde + vektet snittkjøpspris per symbol.
 * P&L-statistikk (totalPnl/winRate) bygger på cleanTradeStats — rene trades
 * med forurensings-cutoff + oversell-clamp (clean-trades.ts, PROMPT #16).
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

    const [accountRes, openTradesRes] = await Promise.all([
      supabase
        .from("paper_accounts")
        .select("current_balance, initial_balance")
        .eq("user_id", user.id)
        .maybeSingle(),
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

    const openTrades = openTradesRes.data ?? [];

    // Statistikk over hele (ikke-arkiverte) historikken — rene trades med
    // cutoff + oversell-clamp (clean-trades.ts). Samme scope som før:
    // filled paper-trades i ikke-arkiverte sesjoner.
    let cleanTrades: CleanTrade[];
    try {
      cleanTrades = await getCleanTrades(supabase, user.id, sessionIds, {
        mode: "paper",
        status: "filled",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[GET /api/portfolio/summary] trades error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const stats = cleanTradeStats(cleanTrades);

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

    // Beregn balance fra trading_sessions (SSoT — paper_accounts kan være stale).
    // PROMPT #15 A3: sanity-cap 3× initial (samme som leaderboard) — uten cap
    // gir arvet inflasjon fra oversell-bug-perioden urealistisk høy balance.
    const { data: balanceSessions } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok, starting_capital_nok")
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .in("status", ["active", "paused", "stopped"]);

    const sessionsSum = balanceSessions?.reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0),
      0,
    ) ?? null;
    const sessionsInitial = balanceSessions?.reduce(
      (sum, s) => sum + Number(s.starting_capital_nok ?? 0),
      0,
    ) ?? 0;
    const fallbackBalance =
      accountRes.data?.current_balance != null
        ? Number(accountRes.data.current_balance)
        : null;
    // Sanity-cap: sessions-sum > 3× initial = arvet inflasjon → fallback
    const useSessionsBalance =
      sessionsSum != null &&
      sessionsSum > 0 &&
      (sessionsInitial <= 0 || sessionsSum <= sessionsInitial * 3);
    const balance = useSessionsBalance ? sessionsSum : fallbackBalance;
    const initialBalance = useSessionsBalance
      ? sessionsInitial
      : accountRes.data?.initial_balance != null
        ? Number(accountRes.data.initial_balance)
        : null;

    return NextResponse.json({
      balance,
      initialBalance,
      totalTrades: cleanTrades.length,
      closedTrades: stats.closedCount,
      winRate: stats.winRate,
      totalPnl: stats.totalPnl,
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
