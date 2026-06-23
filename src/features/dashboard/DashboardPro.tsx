"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";
import { TrendingUp, Target, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

// Nye WOW-komponenter
import { PortfolioChart } from "@/features/portfolio/PortfolioChart";
import { StatsGrid } from "@/features/portfolio/StatsGrid";
import { LiveTradeFeed } from "@/features/trading/LiveTradeFeed";
import { SkeletonBlock } from "./loading-skeleton";

import { DailyChallenge } from "@/features/account/gamification/DailyChallenge";

// Eksisterende komponenter
import { SimplifiedHero } from "./SimplifiedHero";
import { SmartActions } from "./SmartActions";
import { AutoTradingConfigCard } from "@/features/trading";

// Nye onboarding & retention komponenter
import { FirstTradeReward } from "./FirstTradeReward";
import { PaperToLiveProgress } from "./PaperToLiveProgress";
import GetStartedCard from "./GetStartedCard";

// Enterprise 2026 komponenter
import { PersonalizedGreeting } from "./PersonalizedGreeting";
import { ExplainStatButton } from "./ExplainStatButton";
import { AdvancedAnalyticsSection } from "./AdvancedAnalyticsSection";
import { NLQChat } from "./NLQChat";
import { AIInsightCard } from "./AIInsightCard";
import { FeatureGate } from "@/lib/feature-flags";

// Adaptive state machine
import { computeUserState, type UserState } from "@/hooks/useUserState";

import { PaperTradingList } from "@/features/trading/paper/PaperTradingList";

interface UserStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  currentCapital: number;
  startingCapital: number;
  winningTrades?: number;
  sessionCount?: number;
  recentSessions?: any[];
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
    <div className="bg-[#161719] rounded-2xl p-4 sm:p-5 border border-white/[0.06] space-y-3">
      <SkeletonBlock className="w-8 h-8 rounded-xl" />
      <SkeletonBlock className="h-7 w-24" delay={0.1} />
      <SkeletonBlock className="h-3 w-16" delay={0.2} />
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

  const effectiveStats = stats || {
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    currentCapital: 0,
    startingCapital: 0,
    winningTrades: 0,
    sessionCount: 0,
    recentSessions: [],
  };

  const totalReturn =
    effectiveStats.startingCapital > 0
      ? ((effectiveStats.currentCapital - effectiveStats.startingCapital) /
          effectiveStats.startingCapital) *
        100
      : 0;

  // Adaptive user state — konsolidert til én maskin (NyBruker / Onboarded / AktivTrader / PowerUser)
  const { state: userState } = computeUserState({
    tradesCount: effectiveStats.totalTrades,
    // signupDays proxy: anta 0 hvis ingen trades, ellers 7+ (de har kommet forbi onboarding)
    signupDays: effectiveStats.totalTrades === 0 ? 0 : 7,
    totalPnlPct: totalReturn,
    sessionCount: effectiveStats.sessionCount || 0,
  });

  const statItems = [
    {
      label: t("stats.totalReturn"),
      value: `${effectiveStats.totalPnl > 0 ? "+" : ""}${formatByMode(Math.abs(effectiveStats.totalPnl), preferredTradingMode)}`,
      subtext: t("stats.totalReturnSub"),
      trend: effectiveStats.totalPnl >= 0 ? ("up" as const) : ("down" as const),
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: t("stats.winRate"),
      value: `${Math.round(effectiveStats.winRate * 100)}%`,
      subtext: t("stats.winRateSub", { totalTrades: effectiveStats.totalTrades }),
      trend: effectiveStats.winRate >= 50 ? ("up" as const) : ("down" as const),
      icon: Target,
    },
    {
      label: t("stats.balance"),
      value: formatByMode(effectiveStats.currentCapital, preferredTradingMode),
      subtext: t("stats.balanceSub"),
      trend: "neutral" as const,
      icon: Wallet,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-3 py-4 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        {/* Personalized Greeting — Enterprise 2026 */}
        <PersonalizedGreeting
          userName={userName}
          totalPnl={effectiveStats.totalPnl}
          winRate={effectiveStats.winRate}
          isPriority={isPriority}
        />

        {/* Hero - Simplified balance */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SimplifiedHero
            balance={effectiveStats.currentCapital}
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

        {/* Get Started Checklist Card */}
        {userId && (
          <GetStartedCard
            userId={userId}
            completedLessons={[]}
            onboardingCompleted={onboardingCompleted}
            totalTrades={effectiveStats.totalTrades}
          />
        )}

        {/* Smart Actions — context-aware CTA-kort */}
        <SmartActions userState={userState} cmsData={cmsData} />

        {/* Paper to Live Progress — kun for AktivTrader+ i paper mode */}
        {isPaperMode && userState !== "NyBruker" && userState !== "Onboarded" && (
          <PaperToLiveProgress
            totalTrades={effectiveStats.totalTrades}
            winningTrades={effectiveStats.winningTrades}
          />
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Portfolio Chart — vis for alle, men tom for nye brukere */}
            <PortfolioChart userId={userId} mode={preferredTradingMode} />

            {/* Active Sessions List — Added to fix visibility issue */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {locale === "no" ? "Dine sesjoner" : "Your sessions"}
                </h3>
                {(effectiveStats.sessionCount || 0) > 5 && (
                  <Link 
                    href={`/${locale}/paper-trading`} 
                    className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                  >
                    {locale === "no" ? "Se alle" : "See all"}
                  </Link>
                )}
              </div>
              <PaperTradingList 
                sessions={effectiveStats.recentSessions || []} 
                balance={effectiveStats.currentCapital} 
                locale={locale}
                userId={userId}
                sessionMode={preferredTradingMode}
              />
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
                ) : effectiveStats.totalTrades === 0 ? (
                  <EmptyState emptyText={t("emptyState")} />
                ) : (
                  <div className="space-y-2">
                    <StatsGrid stats={statItems} />
                    <div className="flex items-center gap-3 px-1">
                      <ExplainStatButton statType="totalReturn" value={effectiveStats.totalPnl} />
                      <ExplainStatButton statType="winRate" value={effectiveStats.winRate} />
                      <ExplainStatButton statType="balance" value={effectiveStats.currentCapital} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Scope label */}
            {!isLoading && !isError && (
              <p className="text-xs text-slate-500 text-center">
                {t("scopeLabel", { mode: isPaperMode ? "paper" : "live" })}
              </p>
            )}

            {/* Daily Challenge — kun for brukere som er kommet i gang */}
            {userState !== "NyBruker" && <DailyChallenge userId={userId} />}
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-4 sm:space-y-6">
            {/* AI Insight — Enterprise 2026. Kun for AktivTrader+. Bak feature flag. */}
            {(userState === "AktivTrader" || userState === "PowerUser") && (
              <FeatureGate flag="aiInsight">
                <AIInsightCard />
              </FeatureGate>
            )}

            {/* Trading Mode & Risk Settings */}
            <AutoTradingConfigCard />

            {/* Live Trade Feed — kun for aktive tradere */}
            {userState !== "NyBruker" && userState !== "Onboarded" && (
              <LiveTradeFeed limit={8} />
            )}

            {/* Top Traders — fjernet: viste fake/mock-data */}
          </div>
        </div>

        {/* Advanced Analytics — Enterprise 2026. Kun for PowerUser (auto-expanded) og AktivTrader (collapsed). */}
        {(userState === "AktivTrader" || userState === "PowerUser") && (
          <AdvancedAnalyticsSection
            accountBalance={effectiveStats.currentCapital}
            defaultExpanded={userState === "PowerUser"}
          />
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
                  {cmsData?.upgradeBanner?.title ?? "Klar for neste nivå?"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {cmsData?.upgradeBanner?.description ??
                    "Oppgrader til Bachelor for live trading, avanserte strategier og prioritet support."}
                </p>
              </div>
              <Link
                href={`/${locale}${cmsData?.upgradeBanner?.ctaLink ?? "/priser"}`}
                className="shrink-0 px-6 py-3 bg-gradient-to-r from-[#0052FF] to-[#0052FF]/80 rounded-xl text-white text-sm font-semibold shadow-lg shadow-[#0052FF]/20 hover:shadow-xl hover:shadow-[#0052FF]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center"
              >
                {cmsData?.upgradeBanner?.ctaText ?? "Se priser"}
              </Link>
            </div>
          </div>
        </m.div>
      </div>
    </div>
  );
}

export default DashboardPro;
