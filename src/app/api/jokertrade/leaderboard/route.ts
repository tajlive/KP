/**
 * JokerTrade Leaderboard API
 * GET /api/jokertrade/leaderboard?period=weekly&limit=3
 * Returnerer topp tradere for LeaderboardWidget
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";
  const limit = Math.min(Number(searchParams.get("limit")) || 3, 50);

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/leaderboard_entries?period=eq.${period}&is_public=eq.true&order=rank.asc&limit=${limit}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Supabase error", status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
