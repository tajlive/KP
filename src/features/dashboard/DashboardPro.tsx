"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { TrendingUp, Target, Wallet, AlertCircle, RefreshCw, Zap, Flame } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { DataFreshnessBadge } from "@/shared/ui/DataFreshnessBadge";
import { BalanceAdjustmentBadge, usePreviousBalance } from "@/components/BalanceAdjustmentBadge";
import { MoneyDataBadge } from "@/components/MoneyDataBadge";

// Nye WOW-komponenter
import { PortfolioChart } from "@/features/portfolio/PortfolioChart";
import { StatsGrid } from "@/features/portfolio/StatsGrid";
import { LiveTradeFeed } from "@/features/trading/LiveTradeFeed";
import { PriceTicker } from "./PriceTicker";
import { SkeletonBlock } from "./loading-skeleton";

import { DailyChallenge } from "@/features/account/gamification/DailyChallenge";
import { KltWidget } from "@/features/gamification/KltWidget";

// Eksisterende komponenter
import { SimplifiedHero } from "./SimplifiedHero";
import { SmartActions } from "./SmartActions";
import { DashboardWidget } from "./DashboardWidget";
import { AutoTradingConfigCard } from "@/features/trading";

// Nye onboarding & retention komponenter
import { FirstTradeReward } from "./FirstTradeReward";
import { PaperToLiveProgress } from "./PaperToLiveProgress";
import GetStartedCard from "./GetStartedCard";

// Enterprise 2026 komponenter
import { PersonalizedGreeting } from "./PersonalizedGreeting";
import { NLQChat } from "./NLQChat";
import { AIInsightCard } from "./AIInsightCard";
import { FeatureGate } from "@/lib/feature-flags";
import { WidgetErrorBoundary } from "@/shared/ui/WidgetErrorBoundary";
import { computeUserState, type UserState } from "@/hooks/useUserState";

import {
  PaperTradingList,
  type TradingSession,
} from "@/features/trading/paper/PaperTradingList";

interface UserStats {
  totalTrades: number;
  winRate?: number;
  totalPnl?: number;
  currentCapital?: number;
  startingCapital?: number;
  winningTrades?: number;
  sessionCount?: number;
  /** FIKS 6: KONTO-balanse (paper_accounts) — source of truth, ikke sesjons-sum */
  accountBalance?: number | null;
  /** FIKS 8: Verdi i åpne posisjoner — «Total verdi» = ledig + investert */
  investedCapital?: number;
  /** Timestamp for siste balance-justering (fra paper_accounts.updated_at) */
  accountBalanceUpdatedAt?: string | null;
  recentSessions?: TradingSession[];
}

import type { DashboardCmsData } from "./DashboardContent";

interface DashboardProProps {
  userId?: string;
  preferredTradingMode?: "paper" | "live";
  stats?: UserStats | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onboardingCompleted?: boolean;
  userName?: string;
  cmsData?: DashboardCmsData | null;
  isPriority?: boolean;
}

function StatSkeleton() {
  return (
    <div className="bg-kp-bg-secondary rounded-2xl p-4 sm:p-5 border border-kp-border-light space-y-3">
      <SkeletonBlock className="w-8 h-8 rounded-xl" />
      <SkeletonBlock className="h-7 w-24" delay={0.1} />
      <SkeletonBlock className="h-3 w-16" delay={0.2} />
    </div>
  );
}

function SessionsSkeleton() {
  return (
    <div className="bg-kp-bg-secondary rounded-2xl p-4 sm:p-5 border border-kp-border-light space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-4 w-16" delay={0.1} />
      </div>
      <SkeletonBlock className="h-16 w-full rounded-xl" delay={0.15} />
      <SkeletonBlock className="h-16 w-full rounded-xl" delay={0.2} />
    </div>
  );
}

function ErrorCard({ message, onRetry, t }: { message?: string; onRetry?: () => void; t: (key: string) => string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-red-200 mb-2">
        {t("errorTitle")}
      </h3>
      <p className="text-red-300/80 text-sm mb-4 max-w-md mx-auto">
        {message || t("errorFallback")}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("retry")}
        </button>
      )}
    </div>
  );
}

function EmptyState({ emptyText }: { emptyText: string }) {
  return (
    <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl p-8 text-center border border-gray-200 dark:border-white/[0.06] backdrop-blur-sm">
      <p className="text-gray-500 dark:text-slate-400 text-sm">
        {emptyText}
      </p>
    </div>
  );
}

export function DashboardPro({
  userId,
  preferredTradingMode = "paper",
  stats,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  onboardingCompleted = false,
  userName,
  cmsData,
  isPriority = false,
}: DashboardProProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.dashboardPro");
  const isPaperMode = preferredTradingMode === "paper";
  const { formatByMode } = useCurrency();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Track previous balance for adjustment detection
  const previousBalance = usePreviousBalance(stats?.accountBalance ?? 0);

  useEffect(() => {
    if (!isLoading && !isError && stats) {
      setLastUpdated(new Date());
    }
  }, [isLoading, isError, stats]);

  const effectiveStats = stats || {
    totalTrades: 0,
    winningTrades: 0,
    sessionCount: 0,
    recentSessions: [],
  };

  const formatByModeOrDash = (
    value: number | null | undefined,
    mode: "paper" | "live",
  ) => (value == null ? "—" : formatByMode(value, mode));

  const formatWinRateOrDash = (value: number | null | undefined) =>
    value == null ? "—" : `${Math.round(value * 100)}%`;

  // FIKS 8: Avkastning fra EKTE trading-P&L (totalPnl), ikke konto-differanse.
  // Konto-balansen inkluderer manuelle justeringer (bonuser/reparasjoner) som ikke er handelsresultat —
  // konto-differansen lyver som «avkastning» (observert: konto +138 210 kr men trades −830 kr).
  // «Total verdi» = ledig (accountBalance) + investert (investedCapital) — samme som DashboardTopBar.
  const heroBalance =
    (effectiveStats.accountBalance ?? effectiveStats.currentCapital ?? 0) +
    (effectiveStats.investedCapital ?? 0);
  const totalReturn =
    effectiveStats.totalPnl != null &&
    effectiveStats.startingCapital != null &&
    effectiveStats.startingCapital > 0
      ? (effectiveStats.totalPnl / effectiveStats.startingCapital) * 100
      : undefined;

  // Adaptive user state — konsolidert til én maskin (NyBruker / Onboarded / AktivTrader / PowerUser)
  const { state: userState } = computeUserState({
    tradesCount: effectiveStats.totalTrades,
    // signupDays proxy: anta 0 hvis ingen trades, ellers 7+ (de har kommet forbi onboarding)
    signupDays: effectiveStats.totalTrades === 0 ? 0 : 7,
    totalPnlPct: totalReturn ?? 0,
    sessionCount: effectiveStats.sessionCount || 0,
  });

  const statItems = [
    {
      label: t("stats.totalReturn"),
      value:
        effectiveStats.totalPnl == null
          ? "—"
          : `${effectiveStats.totalPnl >= 0 ? "+" : "-"}${formatByMode(
              Math.abs(effectiveStats.totalPnl),
              preferredTradingMode,
            )}`,
      subtext: t("stats.totalReturnSub"),
      trend:
        effectiveStats.totalPnl == null
          ? ("neutral" as const)
          : effectiveStats.totalPnl >= 0
            ? ("up" as const)
            : ("down" as const),
      icon: TrendingUp,
      highlight: true,
      help: t("stats.totalReturnHelp"),
    },
    {
      label: t("stats.balance"),
      value: (
        <span className="inline-flex items-baseline">
          {formatByModeOrDash(heroBalance, preferredTradingMode)}
          <BalanceAdjustmentBadge
            updatedAt={effectiveStats.accountBalanceUpdatedAt ?? null}
            currentBalance={heroBalance ?? 0}
            previousBalance={previousBalance}
          />
          {/* P0-guardrail (2026-08-12): merker når saldo-data er stale/ukjent */}
          <MoneyDataBadge
            input={{
              source: isPaperMode ? "paper_accounts" : "OKX live",
              updatedAt: effectiveStats.accountBalanceUpdatedAt ?? null,
              currency: isPaperMode ? "NOK" : "USDC",
              value: heroBalance,
            }}
          />
        </span>
      ),
      subtext: t("stats.balanceSub"),
      trend: "neutral" as const,
      icon: Wallet,
      help: t("stats.balanceHelp"),
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-3 py-4 sm:p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
          {/* Personalized Greeting — Enterprise 2026 */}
          <PersonalizedGreeting
            userName={userName}
            totalPnl={effectiveStats.totalPnl}
            isPriority={isPriority}
          />

          {/* Price Ticker — BTC, ETH, SOL, ... */}
          <PriceTicker />

        {/* Hero - Simplified balance */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SimplifiedHero
            balance={heroBalance}
            changePct={totalReturn}
            ctaText={cmsData?.heroCtaText}
            ctaLink={cmsData?.heroCtaLink}
            sessionMode={isPaperMode ? "paper" : "live"}
          />
        </m.div>

        {/* First Trade Reward — kun for Onboarded+ */}
        {userState !== "NyBruker" && (
          <FirstTradeReward totalTrades={effectiveStats.totalTrades} />
        )}

        {/* Get Started Checklist Card — kun for nye brukere */}
        {userId && userState !== "AktivTrader" && userState !== "PowerUser" && (
          <GetStartedCard
            userId={userId}
            completedLessons={[]}
            onboardingCompleted={onboardingCompleted}
            totalTrades={effectiveStats.totalTrades}
          />
        )}

        {/* Smart Actions — context-aware CTA-kort */}
        <DashboardWidget
          title={t("smartActionsTitle")}
          icon={<Zap className="w-5 h-5" />}
          defaultOpen={userState === "NyBruker" || userState === "Onboarded"}
        >
          <SmartActions userState={userState} cmsData={cmsData} />
        </DashboardWidget>

        {/* Paper to Live Progress — kun for AktivTrader+ i paper mode */}
        {isPaperMode && userState !== "NyBruker" && userState !== "Onboarded" && (
          <PaperToLiveProgress
            totalTrades={effectiveStats.totalTrades}
            winningTrades={effectiveStats.winningTrades}
          />
        )}

          {/* Main grid wrapped in error boundary */}
          <WidgetErrorBoundary
            title={t("widgetErrorTitle")}
            message={t("widgetErrorMessage")}
            retryLabel={t("retry")}
            onReset={onRetry}
            resetKeys={[userId ?? "", preferredTradingMode]}
          >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Portfolio Chart — vis for alle, men tom for nye brukere */}
            <PortfolioChart userId={userId} mode={preferredTradingMode} />

            {/* Active Sessions List — Added to fix visibility issue */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("sessionsTitle")}
                </h3>
                <div className="flex items-center gap-3">
                  <DataFreshnessBadge
                    timestamp={lastUpdated}
                    variant="positions"
                  />
                  {(effectiveStats.sessionCount || 0) > 5 && (
                    <Link 
                      href={`/${locale}/handel?view=sessions`} 
                      className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                    >
                      {t("seeAll")}
                    </Link>
                  )}
                </div>
              </div>
              {isLoading ? (
                <SessionsSkeleton />
              ) : (
                <PaperTradingList 
                  sessions={effectiveStats.recentSessions || []} 
                  balance={effectiveStats.accountBalance ?? effectiveStats.currentCapital} 
                  locale={locale}
                  userId={userId}
                  sessionMode={preferredTradingMode}
                />
              )}
            </div>

            {/* Stats Grid — skjult for helt nye brukere */}
            {userState !== "NyBruker" && (
              <>
                {isError ? (
                  <ErrorCard message={errorMessage} onRetry={onRetry} t={t} />
                ) : isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                  </div>
                ) : stats == null ? (
                  <EmptyState
                    emptyText={locale === "no" ? "Ingen data" : "No data"}
                  />
                ) : effectiveStats.totalTrades === 0 ? (
                  <EmptyState
                    emptyText={
                      isPaperMode ? t("emptyStatePaper") : t("emptyStateLive")
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    <StatsGrid stats={statItems} updatedAt={lastUpdated} />
                    {/* C2 (PROMPT #15): ExplainStatButton-rad fjernet — StatsGrid har
                        allerede Info-tooltips per kort. To forklarings-UI-er for
                        samme tall var forvirrende. */}
                    {/* TODO: RecentTrades krever ekte trades-feed (Trade[]) — metrics-APIet
                        har kun recentSessions. Skjult til /api/dashboard/metrics returnerer trades. */}
                  </div>
                )}
              </>
            )}

            {/* Scope label */}
            {!isLoading && !isError && (
              <p className="text-xs text-slate-500 text-center">
                {t("scopeLabel")}
              </p>
            )}

            {/* Daily Challenge — kun for brukere som er kommet i gang */}
            {userState !== "NyBruker" && <DailyChallenge userId={userId} />}

            {/* KLT Widget — vis alltid for alle brukere */}
            <KltWidget />
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-4 sm:space-y-6">
            {/* AI Insight — Enterprise 2026. Kun for AktivTrader+. Bak feature flag. */}
            {(userState === "AktivTrader" || userState === "PowerUser") && (
              <FeatureGate flag="aiInsight">
                <AIInsightCard />
              </FeatureGate>
            )}

          {/* Live Trade Feed — kun for aktive tradere */}
            {userState !== "NyBruker" && userState !== "Onboarded" && (
              <DashboardWidget
                title={t("liveFeedTitle")}
                icon={<Flame className="w-5 h-5" />}
                defaultOpen={false}
              >
                <LiveTradeFeed limit={8} showHeader={false} />
              </DashboardWidget>
            )}

            {/* Top Traders — fjernet: viste fake/mock-data */}
          </div>
        </div>
        </WidgetErrorBoundary>

        {/* Advanced Analytics — link til full analyse-side */}
        {(userState === "AktivTrader" || userState === "PowerUser") && (
          <Link
            href={`/${locale}/dashboard/analysis`}
            className="block rounded-2xl border border-[#1E2530] bg-[#0A0D12] p-5 text-center hover:border-[#0052FF]/30 transition-all"
          >
            <p className="text-sm font-bold text-white mb-1">{t("advancedAnalyticsTitle")}</p>
            <p className="text-xs text-slate-400">{t("advancedAnalyticsDesc")}</p>
            <p className="text-xs text-[#0052FF] mt-2">{t("advancedAnalyticsLink")}</p>
          </Link>
        )}

        {/* NLQ Chat — Enterprise 2026. Kun for PowerUser. */}
        {userState === "PowerUser" && <NLQChat />}

        {/* Upgrade Banner — CMS-drevet */}
        <m.div
          className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0052FF]/5 via-indigo-500/5 to-emerald-500/5 dark:from-[#0052FF]/10 dark:via-indigo-500/8 dark:to-emerald-500/8 pointer-events-none" />
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {cmsData?.upgradeBanner?.title ?? t("upgradeTitle")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {cmsData?.upgradeBanner?.description ?? t("upgradeDescription")}
                </p>
              </div>
              <Link
                href={`/${locale}${cmsData?.upgradeBanner?.ctaLink ?? "/priser"}`}
                className="shrink-0 px-6 py-3 bg-gradient-to-r from-[#0052FF] to-[#0052FF]/80 rounded-xl text-white text-sm font-semibold shadow-lg shadow-[#0052FF]/20 hover:shadow-xl hover:shadow-[#0052FF]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center"
              >
                {cmsData?.upgradeBanner?.ctaText ?? t("upgradeCta")}
              </Link>
            </div>
          </div>
        </m.div>
      </div>
    </div>
    </>
  );
}

export default DashboardPro;
