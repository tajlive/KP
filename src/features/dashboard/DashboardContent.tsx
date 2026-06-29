"use client";

import { useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { RiskMetricsPanel } from "@/features/portfolio/RiskMetricsPanel";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { computeUserState } from "@/hooks/useUserState";
import { AdaptiveDashboard } from "./AdaptiveDashboard";
import TradingModeToggle from "@/features/trading/TradingModeToggle";
import { Badge } from "@/shared/ui/badge";
import type { DashboardMode } from "@/hooks/useDashboardMetrics";
import type { DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";

export interface DashboardCmsData {
  heroCtaText?: string;
  heroCtaLink?: string;
  smartActions?: Array<{
    condition: string;
    title: string;
    description?: string;
    ctaText: string;
    ctaLink: string;
    icon?: string;
    color?: string;
  }>;
  upgradeBanner?: {
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
  };
}

export interface DashboardContentProps {
  userId: string;
  preferredTradingMode?: DashboardMode;
  onboardingCompleted?: boolean;
  userName?: string;
  signupDays?: number;
  cmsData?: DashboardCmsData | null;
  /** Server-side fetched metrics — when provided, skips client-side fetch */
  metrics?: DashboardMetrics | null;
  isPriority?: boolean;
}

export function DashboardContent({
  userId,
  preferredTradingMode = "paper",
  onboardingCompleted = false,
  userName,
  signupDays,
  cmsData,
  metrics: serverMetrics,
  isPriority = false,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const [mode, setMode] = useState<DashboardMode>(preferredTradingMode);
  const [hasSwitched, setHasSwitched] = useState(false);

  const handleModeChange = useCallback((newMode: DashboardMode) => {
    setMode(newMode);
    setHasSwitched(true);
  }, []);

  const useServerMetrics = serverMetrics && !hasSwitched;

  const {
    data: clientData,
    isLoading: clientLoading,
    isError: clientError,
    error: clientErrorObj,
    refetch,
  } = useDashboardMetrics(mode, "active_and_completed", {
    enabled: !useServerMetrics,
  });

  const data = useServerMetrics ? serverMetrics : clientData;
  const isLoading = useServerMetrics ? false : clientLoading;
  const isError = useServerMetrics ? false : clientError;
  const error = useServerMetrics ? null : clientErrorObj;

  const userState = computeUserState({
    tradesCount: data?.totalTrades ?? 0,
    signupDays: signupDays ?? 30,
    sessionCount: data?.sessionCount ?? 0,
    totalPnlPct: data && data.startingCapital > 0
      ? ((data.totalCapital - data.startingCapital) / data.startingCapital) * 100
      : 0,
  }).state;

  const stats = data
    ? {
        totalTrades: data.totalTrades,
        // Keep winRate as a 0-1 fraction; DashboardPro/AdaptiveDashboard multiply by 100 for display.
        winRate: data.winRate,
        totalPnl: data.totalPnl,
        currentCapital: data.totalCapital,
        startingCapital: data.startingCapital,
        winningTrades: data.winningTrades,
      }
    : null;

  return (
    <div suppressHydrationWarning>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-kp-bg-primary min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-8 pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <Badge variant="outline" className="w-fit text-xs">
              {mode === "paper"
                ? t("dashboardPro.showingPaper")
                : t("dashboardPro.showingLive")}
            </Badge>
            <TradingModeToggle
              mode={mode}
              onToggle={handleModeChange}
              paperLabel={t("tradingMode.paper")}
              liveLabel={t("tradingMode.live")}
            />
          </div>

          <AdaptiveDashboard
            userId={userId}
            userState={userState}
            userName={userName}
            preferredTradingMode={mode}
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.message}
            onRetry={refetch}
            cmsData={cmsData}
            isPriority={isPriority}
          />
        </div>

        <div className="bg-kp-bg-primary px-0 sm:px-4 md:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <RiskMetricsPanel />
          </div>
        </div>
      </m.div>
    </div>
  );
}
