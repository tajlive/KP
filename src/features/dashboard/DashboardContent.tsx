"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { RiskMetricsPanel } from "@/features/portfolio/RiskMetricsPanel";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { computeUserState } from "@/hooks/useUserState";
import { AdaptiveDashboard } from "./AdaptiveDashboard";
import TradingModeToggle from "@/features/trading/TradingModeToggle";
import { DashboardTopBar } from "./DashboardTopBar";
import { useTradingMode } from "@/context/TradingModeContext";
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
  const { mode, setMode } = useTradingMode();

  // Keep server metrics only until the user actively switches mode; after that,
  // fetch client-side data for the newly selected mode.
  const hasSwitched = mode !== preferredTradingMode;

  const handleModeChange = useCallback(
    (newMode: DashboardMode) => {
      setMode(newMode);
    },
    [setMode],
  );

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

  const totalReturn = useMemo(() => {
    if (!data || data.startingCapital <= 0) return undefined;
    // FIKS 8: Avkastning fra EKTE trading-P&L (totalPnl), ikke konto-differanse.
    // Konto-balansen inkluderer manuelle justeringer — konto-differansen lyver som «avkastning».
    return (data.totalPnl / data.startingCapital) * 100;
  }, [data]);

  const userState = computeUserState({
    tradesCount: data?.totalTrades ?? 0,
    signupDays: signupDays ?? 30,
    sessionCount: data?.sessionCount ?? 0,
    totalPnlPct: totalReturn ?? 0,
  }).state;

  const stats = data
    ? {
        totalTrades: data.totalTrades,
        // Keep winRate as a 0-1 fraction; DashboardPro/AdaptiveDashboard multiply by 100 for display.
        winRate: data.winRate,
        totalPnl: data.totalPnl,
        currentCapital: data.accountBalance ?? data.totalCapital,
        startingCapital: data.startingCapital,
        winningTrades: data.winningTrades,
        sessionCount: data.sessionCount,
        // FIKS 6: KONTO-balanse (paper_accounts) — source of truth for hero
        accountBalance: data.accountBalance,
        // FIKS 8: investedCapital (åpne posisjoner) — «Total verdi» = ledig + investert overalt
        investedCapital: data.investedCapital ?? 0,
        // DB-rader → PaperTradingList sin TradingSession-type (narrowing + null-guards)
        recentSessions: (data.recentSessions ?? []).map((s) => ({
          id: s.id,
          mode: (s.mode === "live" ? "live" : "paper") as "paper" | "live",
          status: (["active", "paused", "stopped", "crashed"].includes(s.status)
            ? s.status
            : "stopped") as "active" | "paused" | "stopped" | "crashed",
          trading_pair: s.trading_pair,
          strategy_id: s.strategy_id,
          current_capital_nok: s.current_capital_nok ?? 0,
          starting_capital_nok: s.starting_capital_nok ?? 0,
          total_pnl: s.total_pnl ?? 0,
          winning_trades: s.winning_trades ?? 0,
          total_trades: s.total_trades ?? 0,
          created_at: s.created_at,
        })),
      }
    : null;

  return (
    <div suppressHydrationWarning className="bg-kp-bg-primary min-h-screen"
    >
      <DashboardTopBar
        balance={data?.accountBalance ?? data?.totalCapital}
        investedCapital={data?.investedCapital ?? 0}
        positionCount={data?.positionCount ?? 0}
        changePct={totalReturn}
        mode={mode}
        ctaLink={cmsData?.heroCtaLink}
      />

      <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-8 pt-4 sm:pt-6 pb-4">
        <div className="flex justify-end px-3 sm:px-0 mb-4 sm:mb-6">
          {/* Mode-pillen vises i DashboardTopBar — badge fjernet (var 3. gjentakelse) */}
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
    </div>
  );
}
