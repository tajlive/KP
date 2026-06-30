"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { KpiCards } from "./KpiCards";
import { QuickActions } from "./QuickActions";
import { StatusSummary } from "./StatusSummary";
import { SessionList } from "./SessionList";
import { AutoTradingActivation } from "./AutoTradingActivation";
import type {
  DashboardMetrics,
  TradingAnalytics,
  TradingSessionSummary,
} from "@/features/trading-cockpit/types";

interface OverviewProps {
  metrics: DashboardMetrics | null;
  analytics?: TradingAnalytics | null;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  autoTradeSettings: { auto_trading_enabled: boolean | null; risk_profile: string | null; } | null;
  hasMoreSessions?: boolean;
  isLoadingMoreSessions?: boolean;
  onLoadMoreSessions?: () => void;
  onStartRobot?: () => void;
  onPauseAll?: () => void;
  onViewHistory?: () => void;
  onActivateAutoTrading?: () => void;
  isActivatingAutoTrading?: boolean;
  className?: string;
}

export function Overview({
  metrics,
  analytics,
  sessions,
  statusCounts,
  autoTradeSettings,
  hasMoreSessions,
  isLoadingMoreSessions,
  onLoadMoreSessions,
  onStartRobot,
  onPauseAll,
  onViewHistory,
  onActivateAutoTrading,
  isActivatingAutoTrading,
  className,
}: OverviewProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn("space-y-6", className)}>
      <AutoTradingActivation
        autoTradeSettings={autoTradeSettings}
        isLoading={Boolean(isActivatingAutoTrading)}
        onActivate={onActivateAutoTrading ?? (() => {})}
      />

      <KpiCards metrics={metrics} analytics={analytics} />

      <section className="space-y-3">
        <QuickActions
          onStartRobot={onStartRobot}
          onPauseAll={onPauseAll}
          onViewHistory={onViewHistory}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("cockpit.sessions.title")}
        </h2>
        <StatusSummary statusCounts={statusCounts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("cockpit.sessions.title")}
        </h2>
        <SessionList
          sessions={sessions}
          hasMore={hasMoreSessions}
          isLoadingMore={isLoadingMoreSessions}
          onLoadMore={onLoadMoreSessions}
        />
      </section>
    </div>
  );
}
