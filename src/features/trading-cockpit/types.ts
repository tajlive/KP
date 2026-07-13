import type { DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import type { CockpitDatabase } from "./cockpit-database.types";

export { type DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";

export type CockpitMode = "paper" | "live";
export type CockpitTab = "overview" | "trades" | "analysis" | "sessions";

export interface CockpitFilters {
  dateRange: "7d" | "30d" | "90d" | "1y" | "all";
  pair: string | null;
  sessionStatus: "all" | "active" | "paused" | "stopped" | "crashed";
  side: "all" | "buy" | "sell";
  tradeStatus:
    | "all"
    | "filled"
    | "partially_filled"
    | "pending"
    | "cancelled"
    | "failed";
  search: string;
}

export interface CockpitPagination {
  tradesLimit: number;
  tradesCursor: string | null;
  hasMoreTrades: boolean;
}

export interface CockpitError {
  message: string;
  code?: string;
}

export interface TradingCockpitState {
  mode: CockpitMode;
  defaultMode: CockpitMode;
  modeDirty: boolean;
  activeTab: CockpitTab;
  filters: CockpitFilters;
  pagination: CockpitPagination;
  statusCounts: Record<string, number>;
  kpi: DashboardMetrics | null;
  sessions: TradingSessionSummary[];
  trades: Trade[];
  analytics: TradingAnalytics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  error: CockpitError | null;
}


export type TradingSessionSummary = Pick<
  CockpitDatabase["public"]["Tables"]["trading_sessions"]["Row"],
  | "id"
  | "status"
  | "mode"
  | "starting_capital_nok"
  | "current_capital_nok"
  | "total_pnl"
  | "trading_pair"
  | "last_tick_at"
  | "last_status_message"
  | "created_at"
  | "updated_at"
>;

export interface Trade {
  id: string;
  session_id: string;
  trading_pair: string;
  side: string;
  status: string;
  price: number;
  quantity: number;
  fee: number;
  total_value: number;
  realized_pnl: number | null;
  effective_pnl: number | null;
  performance_fee_nok: number | null;
  executed_at: string;
  created_at: string;
  mode?: "paper" | "live";
  strategy_signal?: Record<string, unknown> | null;
  reason_code?: string | null;
  indicator_snapshot?: Record<string, unknown> | null;
}

export interface TradingAnalytics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number | null;
  total_pnl: number;
  total_fees: number;
  starting_capital: number;
  max_drawdown_pct: number | null;
  profit_factor: number | null;
  best_pair: string | null;
  best_pair_pnl: number | null;
  worst_pair: string | null;
  worst_pair_pnl: number | null;
  best_session_id: string | null;
  best_session_pnl: number | null;
  worst_session_id: string | null;
  worst_session_pnl: number | null;
  trades_by_day: Array<{ date: string; pnl: number; trades: number }>;
  trades_by_symbol: Array<{ symbol: string; pnl: number; trades: number }>;
}

export interface CockpitRiskStatus {
  dailyLossLimitReached: boolean;
  maxDrawdownReached: boolean;
  crashed: boolean;
}

export interface CockpitInitialData {
  mode: CockpitMode;
  defaultMode: CockpitMode;
  tab: CockpitTab;
  metrics: DashboardMetrics;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  riskStatus: CockpitRiskStatus;
  canUseLive: boolean;
  autoTradeSettings: {
    auto_trading_enabled: boolean | null;
    risk_profile: string | null;
  } | null;
}
