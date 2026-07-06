"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
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
  const totalPnl = metrics?.totalPnl ?? null;

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      <section className="space-y-2">
        <Card className="bg-kp-bg-card border-kp-border rounded-2xl">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-kp-text-secondary">
              {t("cockpit.kpi.totalPnl")}
            </p>
            <div
              className={cn(
                "text-3xl sm:text-4xl font-bold tabular-nums tracking-tight",
                totalPnl === null
                  ? "text-kp-text-primary"
                  : totalPnl >= 0
                    ? "text-kp-success"
                    : "text-kp-danger",
              )}
            >
              {totalPnl === null ? (
                "—"
              ) : (
                <AnimatedNumber
                  value={totalPnl}
                  prefix="kr "
                  decimals={0}
                  duration={500}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <StatusSummary statusCounts={statusCounts} />

      <KpiCards metrics={metrics} analytics={analytics} />

      {autoTradeSettings?.auto_trading_enabled !== true && (
        <AutoTradingActivation
          autoTradeSettings={autoTradeSettings}
          isLoading={Boolean(isActivatingAutoTrading)}
          onActivate={onActivateAutoTrading ?? (() => {})}
        />
      )}

      <QuickActions
        onStartRobot={onStartRobot}
        onPauseAll={onPauseAll}
        onViewHistory={onViewHistory}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-kp-text-secondary">
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
