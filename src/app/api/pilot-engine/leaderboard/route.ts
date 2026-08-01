/**
 * PilotTrade Leaderboard API
 * GET /api/pilot/leaderboard?period=weekly&limit=3
 * Returnerer topp tradere for LeaderboardWidget
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";
  const limit = Math.min(Number(searchParams.get("limit")) || 3, 50);

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("period", period)
      .eq("is_public", true)
      .order("rank", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, status: 500 },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ success: true, data });
    response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
