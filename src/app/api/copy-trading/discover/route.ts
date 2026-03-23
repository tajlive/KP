import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-auth";
import { DiscoverQuerySchema } from "@/lib/schemas";
import { inferRiskTier } from "@/lib/copy-trading/risk-tier";
import { traderProfilesToDiscoverLeaders } from "@/lib/copy-trading/discover-from-trader-profiles";
import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import type { Database } from "@/types/supabase-generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BotRow = Database["public"]["Tables"]["leaderboard_bots"]["Row"];

function sortBots(rows: BotRow[], timeframe: "7d" | "30d" | "90d"): BotRow[] {
  const pnlKey: "pnl_30d" | "pnl_90d" =
    timeframe === "90d" ? "pnl_90d" : "pnl_30d";

  return [...rows].sort((a, b) => {
    const fa = a.featured === true ? 1 : 0;
    const fb = b.featured === true ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const sa = a.sort_order ?? 0;
    const sb = b.sort_order ?? 0;
    if (sa !== sb) return sa - sb;
    const ra = a.rank ?? 999_999;
    const rb = b.rank ?? 999_999;
    if (ra !== rb) return ra - rb;
    const pa = Number(a[pnlKey] ?? 0);
    const pb = Number(b[pnlKey] ?? 0);
    return pb - pa;
  });
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = DiscoverQuerySchema.safeParse({
      timeframe: params.timeframe,
      limit: params.limit ? parseInt(params.limit, 10) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { timeframe, limit } = parsed.data;
    const db = createClient();

    const { data: rawRows, error } = await db
      .from("leaderboard_bots")
      .select("*")
      .eq("is_active", true)
      .limit(Math.min(limit * 3, 150));

    if (error) {
      console.error("[copy-trading/discover]", error.message);
      return NextResponse.json(
        { error: "Kunne ikke hente ledere" },
        { status: 500 },
      );
    }

    const sorted = sortBots((rawRows ?? []) as BotRow[], timeframe).slice(
      0,
      limit,
    );

    const { data: follows } = await db
      .from("copy_trading_follows")
      .select("leader_id")
      .eq("follower_id", user.id)
      .eq("is_active", true);

    const followed = new Set(
      (follows ?? []).map((f: { leader_id: string }) => f.leader_id),
    );

    let leaders: DiscoverLeaderDto[] = sorted.map((row) => ({
      id: row.id,
      traderHrefId: row.id,
      leaderAuthUserId: row.user_id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      strategy_type: row.strategy_type,
      pnl_30d: row.pnl_30d,
      pnl_90d: row.pnl_90d,
      win_rate: row.win_rate,
      sharpe_ratio: row.sharpe_ratio,
      follower_count: row.follower_count,
      performance_fee_pct: row.performance_fee_pct,
      max_drawdown_30d: row.max_drawdown_30d,
      is_following: followed.has(row.user_id),
      risk_tier: inferRiskTier(row.sharpe_ratio, row.win_rate),
    }));

    if (leaders.length === 0) {
      const { data: pubProfiles, error: pubErr } = await db
        .from("trader_profiles")
        .select("*")
        .eq("is_public", true)
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (pubErr) {
        console.error(
          "[copy-trading/discover] trader_profiles:",
          pubErr.message,
        );
      } else {
        leaders = traderProfilesToDiscoverLeaders(
          (pubProfiles ??
            []) as Database["public"]["Tables"]["trader_profiles"]["Row"][],
          followed,
        );
      }
    }

    const discoverSource: "none" | "bots" | "trader_profiles" =
      leaders.length === 0
        ? "none"
        : sorted.length > 0
          ? "bots"
          : "trader_profiles";

    return NextResponse.json({ leaders, timeframe, source: discoverSource });
  } catch (e) {
    console.error("[copy-trading/discover]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
