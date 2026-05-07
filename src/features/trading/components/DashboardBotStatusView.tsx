"use client";

import type { Portfolio, Trade, UserStrategy } from "@/lib/trading-api";
import { stopStrategy } from "@/lib/trading-api";
import BotStatusDashboard from "../BotStatusDashboard";
import { useI18nToast } from "@/hooks/useI18nToast";
import type { TradingMode } from "@/lib/trading-api";

interface DashboardBotStatusViewProps {
  portfolio: Portfolio | null;
  activeStrategies: UserStrategy[];
  recentTrades: Trade[];
  formatNOK: (v: number) => string;
  userId: string;
  mode: TradingMode;
  onLoadData: () => void;
  onSetExpandedStrategy: (s: null) => void;
  dashboardMetrics?: {
    totalPnl: number;
    winRate: number;
    totalTrades: number;
  } | null;
}

export function DashboardBotStatusView({
  portfolio,
  activeStrategies,
  recentTrades,
  formatNOK,
  userId,
  mode,
  onLoadData,
  onSetExpandedStrategy,
  dashboardMetrics,
}: DashboardBotStatusViewProps) {
  const { success: showSuccess } = useI18nToast();

  return (
    <BotStatusDashboard
      portfolio={portfolio}
      activeStrategies={activeStrategies}
      recentTrades={recentTrades}
      formatNOK={formatNOK}
      userId={userId}
      dashboardMetrics={dashboardMetrics}
      onAction={async (action) => {
        if (action === "pause" || action === "stop_all") {
          await Promise.all(
            activeStrategies.map((s) => stopStrategy(s.strategy_id, mode)),
          );
          showSuccess("strategy.stopped");
          onLoadData();
        } else if (action === "start_new" || action === "new_strategy") {
          onSetExpandedStrategy(null);
          showSuccess("toasts.general.comingSoon");
        } else if (action === "view_stats") {
          showSuccess("toasts.general.comingSoon");
        }
      }}
    />
  );
}
