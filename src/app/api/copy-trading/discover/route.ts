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
type TraderProfileRow = Database["public"]["Tables"]["trader_profiles"]["Row"];

/** Sorteringsfelter — bots først (featured/sort/rank), deretter PnL for valgt periode */
type InternalLeader = DiscoverLeaderDto & {
  __src: "bot" | "profile";
  __f: number;
  __so: number;
  __rk: number;
};

function sortInternal(
  a: InternalLeader,
  b: InternalLeader,
  timeframe: "7d" | "30d" | "90d",
): number {
  const pnlKey: "pnl_30d" | "pnl_90d" =
    timeframe === "90d" ? "pnl_90d" : "pnl_30d";
  if (b.__f !== a.__f) return b.__f - a.__f;
  if (a.__so !== b.__so) return a.__so - b.__so;
  if (a.__rk !== b.__rk) return a.__rk - b.__rk;
  const pa = Number(a[pnlKey] ?? 0);
  const pb = Number(b[pnlKey] ?? 0);
  return pb - pa;
}

function botToInternal(row: BotRow, followed: Set<string>): InternalLeader {
  return {
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
    __src: "bot",
    __f: row.featured === true ? 1 : 0,
    __so: row.sort_order ?? 0,
    __rk: row.rank ?? 999_999,
  };
}

function stripInternal(l: InternalLeader): DiscoverLeaderDto {
  return {
    id: l.id,
    traderHrefId: l.traderHrefId,
    leaderAuthUserId: l.leaderAuthUserId,
    display_name: l.display_name,
    avatar_url: l.avatar_url,
    strategy_type: l.strategy_type,
    pnl_30d: l.pnl_30d,
    pnl_90d: l.pnl_90d,
    win_rate: l.win_rate,
    sharpe_ratio: l.sharpe_ratio,
    follower_count: l.follower_count,
    performance_fee_pct: l.performance_fee_pct,
    max_drawdown_30d: l.max_drawdown_30d,
    is_following: l.is_following,
    risk_tier: l.risk_tier,
    origin: l.__src === "bot" ? "curated" : "community",
  };
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

    const botPoolLimit = Math.min(400, Math.max(limit * 6, 120));
    const profileFetchLimit = 200;

    const [botsRes, followsRes, profilesRes] = await Promise.all([
      db
        .from("leaderboard_bots")
        .select("*")
        .eq("is_active", true)
        .limit(botPoolLimit),
      db
        .from("copy_trading_follows")
        .select("leader_id")
        .eq("follower_id", user.id)
        .eq("is_active", true),
      db
        .from("trader_profiles")
        .select("*")
        .eq("is_public", true)
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(profileFetchLimit),
    ]);

    if (botsRes.error) {
      console.error("[copy-trading/discover]", botsRes.error.message);
      return NextResponse.json(
        { error: "Kunne ikke hente ledere" },
        { status: 500 },
      );
    }

    if (profilesRes.error) {
      console.error(
        "[copy-trading/discover] trader_profiles:",
        profilesRes.error.message,
      );
    }
    if (followsRes.error) {
      console.error(
        "[copy-trading/discover] copy_trading_follows:",
        followsRes.error.message,
      );
    }

    const followed = new Set(
      (followsRes.data ?? []).map((f: { leader_id: string }) => f.leader_id),
    );

    const rawBots = (botsRes.data ?? []) as BotRow[];
    const botUserIds = new Set(rawBots.map((r) => r.user_id));

    const internal: InternalLeader[] = rawBots.map((row) =>
      botToInternal(row, followed),
    );

    const pubProfiles = (profilesRes.data ?? []) as TraderProfileRow[];
    const profileOnly = pubProfiles.filter((p) => !botUserIds.has(p.user_id));

    const profileDtos = traderProfilesToDiscoverLeaders(profileOnly, followed);
    for (const dto of profileDtos) {
      internal.push({
        ...dto,
        __src: "profile",
        __f: 0,
        __so: 10_000,
        __rk: 999_999,
      });
    }

    internal.sort((a, b) => sortInternal(a, b, timeframe));

    const sliced = internal.slice(0, limit);
    const leaders = sliced.map(stripInternal);

    const inResult = { bot: false, profile: false };
    for (const x of sliced) {
      if (x.__src === "bot") inResult.bot = true;
      if (x.__src === "profile") inResult.profile = true;
    }

    let discoverSource: "none" | "bots" | "trader_profiles" | "mixed" = "none";
    if (leaders.length > 0) {
      if (inResult.bot && inResult.profile) discoverSource = "mixed";
      else if (inResult.bot) discoverSource = "bots";
      else discoverSource = "trader_profiles";
    }

    return NextResponse.json({
      leaders,
      timeframe,
      source: discoverSource,
      meta: {
        activeBotsConsidered: rawBots.length,
        publicProfilesConsidered: pubProfiles.length,
        profileOnlyAdded: profileOnly.length,
      },
    });
  } catch (e) {
    console.error("[copy-trading/discover]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
