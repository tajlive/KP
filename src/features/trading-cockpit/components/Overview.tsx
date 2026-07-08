"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Wallet, TrendingUp, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingWizard } from "./OnboardingWizard";
import { MetricCard } from "./MetricCard";
import { QuickActions } from "./QuickActions";
import { StatusSummary } from "./StatusSummary";
import { TradingModesInfo } from "./TradingModesInfo";
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
  autoTradeSettings: { auto_trading_enabled: boolean | null; risk_profile: string | null } | null;
  hasMoreSessions?: boolean;
  onLoadMoreSessions?: () => void;
  onActivateAutoTrading?: () => void;
  isActivatingAutoTrading?: boolean;
  className?: string;
  showOnboarding?: boolean;
  onDismissOnboarding?: () => void;
}

export function Overview({
  metrics,
  sessions,
  statusCounts,
  className,
  showOnboarding = false,
  onDismissOnboarding,
}: OverviewProps) {
  const t = useTranslations("trading");
  const safeMetrics = metrics ?? {
    totalPnl: 0, totalTrades: 0, winRate: 0,
    totalCapital: 0, startingCapital: 0,
    winningTrades: 0, losingTrades: 0,
    sessionCount: 0, recentSessions: [],
  };

  const hasZeroTrades = safeMetrics.totalTrades === 0;

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      {/* Onboarding Wizard for new users */}
      {showOnboarding && hasZeroTrades && (
        <OnboardingWizard onComplete={onDismissOnboarding ?? (() => {})} />
      )}

      {/* ✨ Handel vs Auto-handel infoboks — alltid synlig */}
      <TradingModesInfo />

      {/* Key Metrics Grid — mobile 2-col, desktop 4-col */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label={t("cockpit.kpi.portfolioValue")}
          value={safeMetrics.totalCapital}
          prefix="kr "
          decimals={0}
          trend="neutral"
          tooltip="Total verdi av porteføljen din akkurat nå"
          icon={<Wallet className="w-4 h-4" />}
        />
        <MetricCard
          label={t("cockpit.kpi.winRate")}
          value={safeMetrics.winRate * 100}
          suffix="%"
          decimals={1}
          trend={(safeMetrics.winRate * 100) >= 50 ? "up" : "down"}
          tooltip="Hvor mange handler som endte i pluss"
          icon={<Target className="w-4 h-4" />}
        />
        <MetricCard
          label={t("cockpit.kpi.totalTrades")}
          value={safeMetrics.totalTrades}
          decimals={0}
          trend="neutral"
          tooltip="Totalt antall handler du har gjort"
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <MetricCard
          label={t("cockpit.kpi.totalPnl")}
          value={safeMetrics.totalPnl}
          prefix="kr "
          decimals={0}
          trend={safeMetrics.totalPnl >= 0 ? "up" : "down"}
          tooltip="Samlet gevinst eller tap"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Status + Quick Actions row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatusSummary statusCounts={statusCounts} />
        <QuickActions />
      </div>
    </div>
  );
}
