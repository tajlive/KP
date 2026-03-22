import type { RiskTier } from "./risk-tier";

export type DiscoverLeaderDto = {
  id: string;
  traderHrefId: string;
  leaderAuthUserId: string;
  display_name: string;
  avatar_url: string | null;
  strategy_type: string | null;
  pnl_30d: number | null;
  pnl_90d: number | null;
  win_rate: number | null;
  sharpe_ratio: number | null;
  follower_count: number | null;
  performance_fee_pct: number | null;
  max_drawdown_30d: number | null;
  is_following: boolean;
  risk_tier: RiskTier;
};
