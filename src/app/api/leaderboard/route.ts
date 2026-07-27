/**
 * Leaderboard API — Kun ekte brukere (FACT-AUDIT 2.2)
 *
 * GET /api/leaderboard?period=weekly
 *
 * Tidligere: leste fra leaderboard_entries (seed-data med AI-navn og
 * oppdiktede return_pct som +4943%). Alle 11 rader hadde identisk
 * created_at (2026-07-09 22:58:39.522119) — bevis på bulk-seed.
 *
 * Nå: bygger leaderboard fra paper_accounts (reell balanse),
 * trading_stats (antall handler, win-rate), og user_profiles (navn).
 * Ingen seed-data. Kun ekte brukere med faktiske handler.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LeaderboardRow {
  user_id: string;
  user_display_name: string;
  avatar_url: string | null;
  return_pct: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  rank: number;
  risk_level: string;
  period: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";

  try {
    const supabase = await createClient();

    // Hent reell balanse fra paper_accounts + handelsstatistikk fra trading_stats
    const { data: raw, error } = await supabase
      .from("paper_accounts")
      .select(`
        user_id,
        current_balance,
        user_profiles!inner(display_name, avatar_url),
        trading_stats(total_trades, winning_trades)
      `)
      .gt("current_balance", 0)
      .order("current_balance", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leaderboard: LeaderboardRow[] = [];

    for (const row of raw ?? []) {
      const userId = row.user_id as string;
      if (!userId || (userId as string).includes("0000-0000")) continue;

      const balance = Number(row.current_balance ?? 0);
      const startBalance = 100_000;
      const returnPct = ((balance - startBalance) / startBalance) * 100;

      // Hent trading_stats fra nestede data
      const stats = (row as any).trading_stats;
      const totalTrades = stats?.total_trades ?? 0;
      const winningTrades = stats?.winning_trades ?? 0;
      const winRate = totalTrades > 0
        ? Math.round((winningTrades / totalTrades) * 1000) / 10
        : 0;

      // Hent user_profiles fra nestede data
      const profile = (row as any).user_profiles;

      leaderboard.push({
        user_id: userId,
        user_display_name: profile?.display_name
          || `Trader***${String(userId).slice(0, 4)}`,
        avatar_url: profile?.avatar_url ?? null,
        return_pct: Math.round(returnPct * 100) / 100,
        sharpe_ratio: 0, // Ikke tilgjengelig uten historisk volatilitetsdata
        win_rate: winRate,
        total_trades: totalTrades,
        rank: 0, // Fylles ut nedenfor
        risk_level: "moderate",
        period,
      });
    }

    // Sett rank basert på return_pct synkende
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
