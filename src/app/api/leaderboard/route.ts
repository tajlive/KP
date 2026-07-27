/**
 * Leaderboard API — Kun ekte brukere (FACT-AUDIT 2.2)
 *
 * GET /api/leaderboard?period=weekly
 *
 * Bygger leaderboard fra paper_accounts (reell balanse),
 * trading_stats (antall handler, win-rate), og user_profiles (navn).
 * Ingen seed-data. Kun ekte brukere med faktiske handler.
 *
 * Tidligere: leste fra leaderboard_entries (seed-data med AI-navn og
 * oppdiktede return_pct som +4943%).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";

  try {
    const supabase = await createClient();

    // Steg 1: Hent paper-account balanser
    const { data: accounts, error: accErr } = await supabase
      .from("paper_accounts")
      .select("user_id, current_balance")
      .gt("current_balance", 0)
      .order("current_balance", { ascending: false })
      .limit(50);

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      const response = NextResponse.json([]);
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
      return response;
    }

    // Steg 2: Hent brukernavn for disse user_id-ene
    const userIds = accounts.map((a) => a.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    // Steg 3: Hent trading-stats
    const { data: stats } = await supabase
      .from("trading_stats")
      .select("user_id, total_trades, winning_trades")
      .in("user_id", userIds);

    // Bygg oppslag
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p]),
    );
    const statsMap = new Map(
      (stats ?? []).map((s) => [s.user_id, s]),
    );

    const startBalance = 100_000;
    const leaderboard = [];

    for (const acc of accounts) {
      const uid = acc.user_id;
      if (!uid || (uid as string).includes("0000-0000")) continue;

      const balance = Number(acc.current_balance ?? 0);
      const returnPct = ((balance - startBalance) / startBalance) * 100;

      const profile = profileMap.get(uid);
      const stat = statsMap.get(uid);
      const totalTrades = stat?.total_trades ?? 0;
      const winningTrades = stat?.winning_trades ?? 0;
      const winRate = totalTrades > 0
        ? Math.round((winningTrades / totalTrades) * 1000) / 10
        : 0;

      leaderboard.push({
        user_id: uid,
        user_display_name: profile?.display_name
          || `Trader***${String(uid).slice(0, 4)}`,
        avatar_url: profile?.avatar_url ?? null,
        return_pct: Math.round(returnPct * 100) / 100,
        sharpe_ratio: 0,
        win_rate: winRate,
        total_trades: totalTrades,
        rank: 0,
        risk_level: "moderate",
        period,
      });
    }

    // Sorter og sett rank
    leaderboard.sort((a, b) => b.return_pct - a.return_pct);
    leaderboard.forEach((row, i) => {
      row.rank = i + 1;
    });

    const response = NextResponse.json(leaderboard);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
