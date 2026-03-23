import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import { inferRiskTier } from "@/lib/copy-trading/risk-tier";
import type { Database } from "@/types/supabase-generated";

type TraderProfileRow = Database["public"]["Tables"]["trader_profiles"]["Row"];

/**
 * Når leaderboard_bots er tom: vis offentlige creator-profiler i discover.
 * PnL-kolonner mappes fra profilens ROI / estimater (ikke sanntid Binance).
 */
export function traderProfilesToDiscoverLeaders(
  rows: TraderProfileRow[],
  followed: Set<string>,
): DiscoverLeaderDto[] {
  return rows.map((row) => {
    const roi = Number(row.all_time_roi ?? 0);
    const wr = row.win_rate ?? 50;
    const sr = row.sharpe_ratio ?? 0;
    return {
      id: row.id,
      traderHrefId: row.id,
      leaderAuthUserId: row.user_id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      strategy_type: "Community",
      pnl_30d: roi,
      pnl_90d: roi,
      win_rate: wr,
      sharpe_ratio: sr,
      follower_count: row.follower_count,
      performance_fee_pct: row.performance_fee_pct,
      max_drawdown_30d: null,
      is_following: followed.has(row.user_id),
      risk_tier: inferRiskTier(sr, wr),
    };
  });
}
