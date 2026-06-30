"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { KpiCards } from "./KpiCards";
import { QuickActions } from "./QuickActions";
import { StatusSummary } from "./StatusSummary";
import { SessionList } from "./SessionList";
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
  hasMoreSessions?: boolean;
  isLoadingMoreSessions?: boolean;
  onLoadMoreSessions?: () => void;
  onStartRobot?: () => void;
  onPauseAll?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

export function Overview({
  metrics,
  analytics,
  sessions,
  statusCounts,
  hasMoreSessions,
  isLoadingMoreSessions,
  onLoadMoreSessions,
  onStartRobot,
  onPauseAll,
  onViewHistory,
  className,
}: OverviewProps) {
  const t = useTranslations("trading");

  return (
    <div className={cn("space-y-6", className)}>
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
