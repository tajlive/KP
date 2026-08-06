import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  classifyCurrency,
  fetchPriceRefs,
  type PriceRef,
  type TradeRow,
} from "@/lib/admin/trade-health-shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SESSIONS_PER_USER = 12;

/**
 * GET /api/admin/trade-health — trade-kvalitetshelse (samme sjekker som
 * scripts/trade-quality-monitor.mjs, lesbart fra adminpanelet).
 */
export async function GET() {
  const auth = await verifyAdminAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as SupabaseClient<Database>;

    let ref: PriceRef = {};
    let priceSource = "coingecko";
    try {
      ref = await fetchPriceRefs();
    } catch {
      priceSource = "unavailable";
    }

    const [tradesRes, sessionsRes, accountsRes, profilesRes] = await Promise.all([
      db.from("trades")
        .select("id, user_id, trading_pair, side, quantity, price, total_value, fee, realized_pnl, usdt_nok_rate, is_mock, executed_at")
        .order("executed_at", { ascending: true }),
      db.from("trading_sessions").select("id, user_id, status, created_at"),
      db.from("paper_accounts").select("user_id, current_balance"),
      db.from("user_profiles").select("id, paper_balance"),
    ]);
    if (tradesRes.error) throw new Error(tradesRes.error.message);
    if (sessionsRes.error) throw new Error(sessionsRes.error.message);

    const trades = (tradesRes.data ?? []) as TradeRow[];
    const sessions = (sessionsRes.data ?? []) as { id: string; user_id: string; status: string; created_at: string }[];
    const accounts = (accountsRes.data ?? []) as { user_id: string; current_balance: number }[];
    const profiles = (profilesRes.data ?? []) as { id: string; paper_balance: number }[];

    const real = trades.filter((t) => t.is_mock !== true);
    const mockCount = trades.length - real.length;

    let usdtFull = 0, usdtMixed = 0, ambiguous = 0;
    if (Object.keys(ref).length > 0) {
      for (const t of real) {
        const c = classifyCurrency(t, ref);
        if (c === "full") usdtFull++;
        else if (c === "mixed") usdtMixed++;
        else if (c === "ambiguous") ambiguous++;
      }
    }

    const sessionsByUser = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const arr = sessionsByUser.get(s.user_id) ?? [];
      arr.push(s);
      sessionsByUser.set(s.user_id, arr);
    }
    const usersOverLimit = [...sessionsByUser.values()].filter((s) => s.length > MAX_SESSIONS_PER_USER).length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;

    const profMap = new Map(profiles.map((p) => [p.id, Number(p.paper_balance)]));
    const balanceDrift = accounts.filter((a) => {
      const pb = profMap.get(a.user_id);
      return pb != null && Math.abs(pb - Number(a.current_balance)) > 0.01;
    }).length;

    // Win-rate per par, siste 30 dager (FIFO per bruker+par)
    const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
    const recent = real.filter((t) => t.executed_at >= cutoff);
    const lots = new Map<string, { qty: number; price: number }[]>();
    const pairStats = new Map<string, { closed: number; wins: number; pnl: number }>();
    for (const t of recent) {
      const key = `${t.user_id}|${t.trading_pair}`;
      const side = t.side.toLowerCase();
      const qty = Number(t.quantity), price = Number(t.price);
      if (side === "buy") {
        const arr = lots.get(key) ?? [];
        arr.push({ qty, price });
        lots.set(key, arr);
      } else if (side === "sell") {
        const arr = lots.get(key) ?? [];
        let rem = qty;
        while (rem > 1e-12 && arr.length > 0) {
          const lot = arr[0];
          const take = Math.min(lot.qty, rem);
          const pnl = (price - lot.price) * take;
          const st = pairStats.get(t.trading_pair) ?? { closed: 0, wins: 0, pnl: 0 };
          st.closed++;
          if (pnl > 0) st.wins++;
          st.pnl += pnl;
          pairStats.set(t.trading_pair, st);
          lot.qty -= take;
          rem -= take;
          if (lot.qty <= 1e-12) arr.shift();
        }
        lots.set(key, arr);
      }
    }
    const perPair = [...pairStats.entries()]
      .map(([pair, s]) => ({
        pair,
        closed: s.closed,
        winRate: s.closed > 0 ? Math.round((s.wins / s.closed) * 1000) / 10 : null,
        pnl: Math.round(s.pnl * 100) / 100,
      }))
      .sort((a, b) => a.pnl - b.pnl);

    const issues: string[] = [];
    if (mockCount > 0) issues.push("mock_rows");
    if (usdtFull + usdtMixed > 0) issues.push("currency_anomalies");
    if (usersOverLimit > 0) issues.push("session_proliferation");
    if (balanceDrift > 0) issues.push("balance_drift");

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      priceSource,
      health: issues.length === 0 ? "clean" : "issues",
      issues,
      stats: {
        tradesTotal: trades.length,
        mockRows: mockCount,
        usdtRows: usdtFull,
        mixedRows: usdtMixed,
        ambiguousRows: ambiguous,
        sessionsTotal: sessions.length,
        activeSessions,
        usersOverSessionLimit: usersOverLimit,
        maxSessionsPerUser: MAX_SESSIONS_PER_USER,
        balanceDriftUsers: balanceDrift,
        usersWithTrades: new Set(trades.map((t) => t.user_id)).size,
      },
      perPair30d: perPair,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
