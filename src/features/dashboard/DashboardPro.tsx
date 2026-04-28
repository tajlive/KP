"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { TrendingUp, Target, Wallet, AlertCircle, RefreshCw } from "lucide-react";

// Nye WOW-komponenter
import { PortfolioChart } from "./PortfolioChart";
import { StatsGrid } from "./StatsGrid";
import { LiveTradeFeed } from "@/features/trading/LiveTradeFeed";
import { TopTradersPreview } from "@/features/copy-trading/TopTradersPreview";
import { DailyChallenge } from "@/features/gamification/DailyChallenge";

// Eksisterende komponenter
import { SimplifiedHero } from "./SimplifiedHero";
import { SmartActions } from "./SmartActions";
import { AutoTradingConfigCard } from "./AutoTradingConfigCard";

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

interface UserStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  currentCapital: number;
  startingCapital: number;
  winningTrades?: number;
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
}

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 shadow-sm animate-pulse">
      <div className="h-4 w-4 bg-slate-700 rounded mb-2" />
      <div className="h-8 w-24 bg-slate-700 rounded mb-1" />
      <div className="h-3 w-16 bg-slate-700 rounded" />
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const locale = useLocale();
  const isNo = locale === "no";

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-red-200 mb-2">
        {isNo ? "Kunne ikke laste dashboard-tall" : "Could not load dashboard metrics"}
      </h3>
      <p className="text-red-300/80 text-sm mb-4 max-w-md mx-auto">
        {message ||
          (isNo
            ? "Prøv igjen, eller kontakt support hvis problemet vedvarer."
            : "Please try again or contact support if the issue persists.")}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {isNo ? "Prøv igjen" : "Try again"}
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  const locale = useLocale();
  const isNo = locale === "no";

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
      <p className="text-slate-400 text-sm">
        {isNo
          ? "Ingen handler ennå for valgt modus. Start en ny session for å se statistikk."
          : "No trades yet for the selected mode. Start a new session to see statistics."}
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
}: DashboardProProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const isPaperMode = preferredTradingMode === "paper";

  const effectiveStats = stats || {
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    currentCapital: 0,
    startingCapital: 0,
    winningTrades: 0,
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
  });

  const statItems = [
    {
      label: isNo ? "Total avkastning" : "Total Return",
      value: `${effectiveStats.totalPnl > 0 ? "+" : ""}${effectiveStats.totalPnl.toLocaleString()} kr`,
      subtext: isNo ? "Akkumulert profitt" : "Accumulated profit",
      trend: effectiveStats.totalPnl >= 0 ? ("up" as const) : ("down" as const),
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: isNo ? "Vinnrate" : "Win rate",
      value: `${effectiveStats.winRate}%`,
      subtext: isNo
        ? `${effectiveStats.totalTrades} handler totalt`
        : `${effectiveStats.totalTrades} trades total`,
      trend: effectiveStats.winRate >= 50 ? ("up" as const) : ("down" as const),
      icon: Target,
    },
    {
      label: isNo ? "Kontobalanse" : "Account Balance",
      value: `${Math.round(effectiveStats.currentCapital).toLocaleString()} kr`,
      subtext: isNo ? "Tilgjengelig kapital" : "Available capital",
      trend: "neutral" as const,
      icon: Wallet,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Personalized Greeting — Enterprise 2026 */}
        <PersonalizedGreeting
          userName={userName}
          totalPnl={effectiveStats.totalPnl}
          winRate={effectiveStats.winRate}
        />

        {/* Hero - Simplified balance */}
        <motion.div
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
        </motion.div>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Chart — vis for alle, men tom for nye brukere */}
            <PortfolioChart userId={userId} mode={preferredTradingMode} />

            {/* Stats Grid — skjult for helt nye brukere */}
            {userState !== "NyBruker" && (
              <>
                {isError ? (
                  <ErrorCard message={errorMessage} onRetry={onRetry} />
                ) : isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                  </div>
                ) : effectiveStats.totalTrades === 0 ? (
                  <EmptyState />
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
                {isNo
                  ? `Basert på aktive og fullførte ${isPaperMode ? "paper" : "live"}-sessions`
                  : `Based on active and completed ${isPaperMode ? "paper" : "live"} sessions`}
              </p>
            )}

            {/* Daily Challenge — kun for brukere som er kommet i gang */}
            {userState !== "NyBruker" && <DailyChallenge userId={userId} />}
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
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

            {/* Top Traders — kun for AktivTrader+ */}
            {userState === "AktivTrader" || userState === "PowerUser" ? (
              <TopTradersPreview />
            ) : null}
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
        <motion.div
          className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-gray-200 dark:border-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                {cmsData?.upgradeBanner?.title ?? "Klar for neste nivå?"}
              </h3>
              <p className="text-slate-400 mt-1">
                {cmsData?.upgradeBanner?.description ??
                  "Oppgrader til Bachelor for live trading, avanserte strategier og prioritet support."}
              </p>
            </div>
            <Link
              href={`/${locale}${cmsData?.upgradeBanner?.ctaLink ?? "/priser"}`}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap inline-flex items-center justify-center"
            >
              {cmsData?.upgradeBanner?.ctaText ?? "Se priser"}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default DashboardPro;
