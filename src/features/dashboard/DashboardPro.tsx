"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { TrendingUp, Target, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/new/AuthContext";

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
import { NewUserHero } from "./NewUserHero";
import { FirstTradeReward } from "./FirstTradeReward";
import { PaperToLiveProgress } from "./PaperToLiveProgress";
import GetStartedCard from "./GetStartedCard";

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
  paperBalance?: number;
  sessionId?: string;
  sessionMode?: string;
  trades?: unknown[];
  initialStats?: UserStats;
  onboardingCompleted?: boolean;
  userName?: string;
  cmsData?: DashboardCmsData | null;
}

export function DashboardPro({
  paperBalance = 100000,
  sessionId,
  sessionMode = "paper",
  initialStats,
  onboardingCompleted = false,
  userName,
  cmsData,
}: DashboardProProps) {
  const { user } = useAuth();
  const locale = useLocale();
  const isNo = locale === "no";
  const stats = initialStats || {
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    currentCapital: paperBalance,
    startingCapital: 100000,
    winningTrades: 0,
  };

  const totalReturn = ((stats.currentCapital - stats.startingCapital) / stats.startingCapital) * 100;
  const isPaperMode = !sessionId || sessionMode === "paper";

  // Bestem brukertilstand for SmartActions
  const userState = !sessionId
    ? stats.totalTrades === 0
      ? "newUser"
      : "noSession"
    : isPaperMode
      ? "paperMode"
      : "liveMode";

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero - Simplified balance */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SimplifiedHero
              balance={stats.currentCapital}
              changePct={totalReturn}
              ctaText={cmsData?.heroCtaText}
              ctaLink={cmsData?.heroCtaLink}
              sessionMode={isPaperMode ? "paper" : "live"}
            />
          </motion.div>

          {/* New User Hero - shown after onboarding, before first trade */}
          {onboardingCompleted && stats.totalTrades === 0 && (
            <NewUserHero userName={userName} />
          )}

          {/* First Trade Reward - shown after first trade (once) */}
          <FirstTradeReward totalTrades={stats.totalTrades} />

          {/* Get Started Checklist Card */}
          {user?.id && (
            <GetStartedCard
              userId={user.id}
              completedLessons={[]}
              onboardingCompleted={onboardingCompleted}
              totalTrades={stats.totalTrades}
            />
          )}

          {/* Smart Actions — context-aware CTA-kort */}
          <SmartActions userState={userState} locale={locale} cmsData={cmsData} />

          {/* Paper to Live Progress */}
          {isPaperMode && (
            <PaperToLiveProgress
              totalTrades={stats.totalTrades}
              winningTrades={stats.winningTrades}
            />
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Portfolio Chart */}
              <PortfolioChart userId={user?.id} sessionId={sessionId} />

              {/* Stats Grid */}
              <StatsGrid stats={[
                {
                  label: isNo ? "Total avkastning" : "Total Return",
                  value: `${stats.totalPnl > 0 ? "+" : ""}${stats.totalPnl.toLocaleString()} kr`,
                  subtext: isNo ? "Akkumulert profitt" : "Accumulated profit",
                  trend: stats.totalPnl >= 0 ? "up" : "down",
                  icon: TrendingUp,
                  highlight: true,
                },
                {
                  label: "Win rate",
                  value: `${stats.winRate}%`,
                  subtext: isNo ? `${stats.totalTrades} trades totalt` : `${stats.totalTrades} trades total`,
                  trend: stats.winRate >= 50 ? "up" : "down",
                  icon: Target,
                },
                {
                  label: isNo ? "Kontobalanse" : "Account Balance",
                  value: `${Math.round(stats.currentCapital).toLocaleString()} kr`,
                  subtext: isNo ? "Tilgjengelig kapital" : "Available capital",
                  trend: "neutral",
                  icon: Wallet,
                },
              ]} />

              {/* Daily Challenge */}
              <DailyChallenge userId={user?.id} />
            </div>

            {/* Right column - 1/3 width */}
            <div className="space-y-6">
              {/* Trading Mode & Risk Settings */}
              <AutoTradingConfigCard />

              {/* Live Trade Feed */}
              <LiveTradeFeed limit={8} />

              {/* Top Traders */}
              <TopTradersPreview />
            </div>
          </div>

          {/* Upgrade Banner — CMS-drevet */}
          <motion.div
            className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-slate-700"
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
                  {cmsData?.upgradeBanner?.description ?? "Oppgrader til Bachelor for live trading, avanserte strategier og prioritet support."}
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
