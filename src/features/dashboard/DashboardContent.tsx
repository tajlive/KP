"use client";

import { m, AnimatePresence } from "framer-motion";
import { RiskMetricsPanel } from "./RiskMetricsPanel";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { computeUserState } from "@/hooks/useUserState";
import { AdaptiveDashboard } from "./AdaptiveDashboard";
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
}

export function DashboardContent({
  userId,
  preferredTradingMode = "paper",
  onboardingCompleted = false,
  userName,
  signupDays,
  cmsData,
  metrics: serverMetrics,
}: DashboardContentProps) {
  const {
    data: clientData,
    isLoading: clientLoading,
    isError: clientError,
    error: clientErrorObj,
    refetch,
  } = useDashboardMetrics(preferredTradingMode, "active_and_completed", {
    enabled: !serverMetrics,
  });

  const data = serverMetrics ?? clientData;
  const isLoading = serverMetrics ? false : clientLoading;
  const isError = serverMetrics ? false : clientError;
  const error = serverMetrics ? null : clientErrorObj;

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
        winRate: Math.round(data.winRate * 100),
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
        className="bg-gray-50 dark:bg-slate-950 min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-8 pt-4 sm:pt-6 pb-4">
          <AdaptiveDashboard
            userId={userId}
            userState={userState}
            userName={userName}
            preferredTradingMode={preferredTradingMode}
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.message}
            onRetry={refetch}
            cmsData={cmsData}
          />
        </div>

        <div className="bg-gray-50 dark:bg-slate-950 px-0 sm:px-4 md:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <RiskMetricsPanel />
          </div>
        </div>
      </m.div>
    </div>
  );
}
