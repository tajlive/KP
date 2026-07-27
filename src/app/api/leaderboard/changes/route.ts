/**
 * Social Proof API — Leaderboard Changes
 *
 * GET /api/leaderboard/changes
 * Sammenligner nåværende leaderboard med siste snapshot
 * Returnerer hvem som passerte hvem
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface LeaderboardChange {
  user_id: string;
  user_display_name: string;
  period: string;
  old_rank: number;
  new_rank: number;
  rank_change: number; // negativ = klatret, positiv = falt
  return_pct: number;
  win_rate: number;
}

/** GET /api/leaderboard/changes?period=weekly */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodRaw = searchParams.get("period") || "weekly";
  const VALID_PERIODS = new Set(["weekly", "monthly", "all_time"]);
  const period = VALID_PERIODS.has(periodRaw) ? periodRaw : "weekly";

  try {
    // 1. Hent nyeste snapshot for denne perioden
    const snapRes = await fetch(
      `${supabaseUrl}/rest/v1/leaderboard_snapshots?select=*&period=eq.${period}&order=snapped_at.desc&limit=100`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!snapRes.ok) {
      // Ingen snapshots enda — returner tomt
      return NextResponse.json({ success: true, data: [] });
    }

    // REST-JSON er utypet — eksplisitte rad-typer
    interface SnapshotRow {
      user_id: string;
      rank: number;
    }
    const snapshots: SnapshotRow[] = await snapRes.json();

    // 2. Hent gjeldende leaderboard
    const lbRes = await fetch(
      `${supabaseUrl}/rest/v1/leaderboard_entries?period=eq.${period}&is_public=eq.true&order=rank.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!lbRes.ok) {
      return NextResponse.json(
        { error: "Leaderboard error", status: lbRes.status },
        { status: lbRes.status },
      );
    }

    interface LeaderboardRow {
      user_id: string;
      rank: number;
      user_display_name: string | null;
      return_pct: number | null;
      win_rate: number | null;
    }
    const leaderboard: LeaderboardRow[] = await lbRes.json();

    // 3. Finn endringer
    const snapshotRankMap = new Map<string, number>();
    const snapshotDataMap = new Map<string, SnapshotRow>();
    for (const s of snapshots) {
      if (!snapshotRankMap.has(s.user_id)) {
        snapshotRankMap.set(s.user_id, s.rank);
        snapshotDataMap.set(s.user_id, s);
      }
    }

    const changes: LeaderboardChange[] = [];

    for (const entry of leaderboard) {
      const oldRank = snapshotRankMap.get(entry.user_id);
      if (oldRank === undefined) continue; // Ny på leaderboard

      const newRank = entry.rank;
      if (oldRank !== newRank) {
        changes.push({
          user_id: entry.user_id,
          user_display_name: entry.user_id
            ? `Trader***${String(entry.user_id).slice(0, 4)}`
            : "Trader",
          period,
          old_rank: oldRank,
          new_rank: newRank,
          rank_change: oldRank - newRank, // positiv = klatret
          return_pct: entry.return_pct ?? 0,
          win_rate: entry.win_rate ?? 0,
        });
      }
    }

    // Sorter: størst klatring først
    changes.sort((a, b) => b.rank_change - a.rank_change);

    return NextResponse.json({ success: true, data: changes });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
