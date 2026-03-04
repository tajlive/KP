// ============================================================================
// GET /api/copy-trading/leaderboard
// KLA-94: Returns the copy trading leaderboard
// Public endpoint - no authentication required
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  pnl30d: number;
  pnl90d: number;
  pnlAllTime: number;
  winRate: number;
  sharpeRatio: number;
  followerCount: number;
  performanceFeePct: number;
  strategyType: string;
  rank: number;
  isActive: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  period: "30d" | "90d" | "all";
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse | { error: string }>> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as "30d" | "90d" | "all") || "30d";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    // Create Supabase client (unauthenticated for public data)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Fetch from leaderboard_bots table
    let query = supabase
      .from("leaderboard_bots")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    // Order by appropriate P&L column based on period
    if (period === "30d") {
      query = query.order("pnl_30d", { ascending: false });
    } else if (period === "90d") {
      query = query.order("pnl_90d", { ascending: false });
    } else {
      query = query.order("pnl_all_time", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching leaderboard:", error);

      // Fallback to materialized view leaderboard
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_pnl", { ascending: false })
        .range(offset, offset + limit - 1);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch leaderboard" },
          { status: 500 },
        );
      }

      // Map fallback data to LeaderboardEntry format
      const entries: LeaderboardEntry[] =
        fallbackData?.map((entry, index) => ({
          id: entry.user_id,
          userId: entry.user_id,
          displayName: entry.display_name || "Anonym Trader",
          avatarUrl: entry.avatar_url,
          pnl30d: entry.total_pnl || 0,
          pnl90d: entry.total_pnl || 0,
          pnlAllTime: entry.total_pnl || 0,
          winRate: entry.win_rate || 0,
          sharpeRatio: 0,
          followerCount: entry.follower_count || 0,
          performanceFeePct: 0,
          strategyType: "auto",
          rank: offset + index + 1,
          isActive: true,
        })) || [];

      return NextResponse.json({
        entries,
        total: entries.length,
        page,
        limit,
        period,
      });
    }

    // Map data to LeaderboardEntry format
    const entries: LeaderboardEntry[] =
      data?.map((entry, index) => ({
        id: entry.id,
        userId: entry.user_id,
        displayName: entry.display_name || "Anonym Trader",
        avatarUrl: entry.avatar_url,
        pnl30d: entry.pnl_30d || 0,
        pnl90d: entry.pnl_90d || 0,
        pnlAllTime: entry.pnl_all_time || 0,
        winRate: entry.win_rate || 0,
        sharpeRatio: entry.sharpe_ratio || 0,
        followerCount: entry.follower_count || 0,
        performanceFeePct: entry.performance_fee_pct || 0,
        strategyType: entry.strategy_type || "auto",
        rank: entry.rank || offset + index + 1,
        isActive: entry.is_active,
      })) || [];

    return NextResponse.json({
      entries,
      total: count || 0,
      page,
      limit,
      period,
    });
  } catch (error) {
    console.error("Error in /api/copy-trading/leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
