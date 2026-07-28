"use client";

import { m, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { TrendingUp, BarChart3, Wallet } from "lucide-react";
import Link from "next/link";
import type { UserState } from "@/hooks/useUserState";
import { SimplifiedHero } from "./SimplifiedHero";
import { StatsGrid } from "@/features/portfolio/StatsGrid";
import { AITip } from "./AITip";
import { SmartActions } from "./SmartActions";
import { useCurrency } from "@/hooks/useCurrency";

import { OnboardingChecklist } from "./OnboardingChecklist";
import { useOnboardingFlags } from "@/hooks/useOnboardingState";
import { DashboardPro } from "./DashboardPro";
import type { DashboardCmsData } from "./DashboardContent";
import {
  PaperTradingList,
  type TradingSession,
} from "@/features/trading/paper/PaperTradingList";

interface AdaptiveDashboardProps {
  userId: string;
  userState: UserState;
  userName?: string | null;
  preferredTradingMode: "paper" | "live";
  stats: UserStats | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  cmsData?: DashboardCmsData | null;
  isPriority?: boolean;
}

export interface UserStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  currentCapital: number;
  startingCapital: number;
  winningTrades: number;
  recentSessions?: TradingSession[];
}

/* ------------------------------------------------------------------ */
/*  Checklist wrapper — henter state fra hook                          */
/* ------------------------------------------------------------------ */
function OnboardingChecklistFromState({ tradeCount }: { tradeCount: number }) {
  const { hasViewedHistory } = useOnboardingFlags();
  return (
    <OnboardingChecklist
      hasAccount
      tradeCount={tradeCount}
      hasViewedHistory={hasViewedHistory}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  New user state — checklist-driven onboarding                       */
/* ------------------------------------------------------------------ */
function NewUserHero({ tradeCount, userName, preferredTradingMode }: { tradeCount: number; userName?: string | null; preferredTradingMode: "paper" | "live" }) {
  const t = useTranslations("dashboard.adaptive");

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          {userName
            ? t("welcomeTitle", { userName })
            : t("welcomeTitle", { userName: "" }).replace(", ", "")}
        </h2>
        <p className="text-slate-400 max-w-md mx-auto">
          {t("welcomeSubtitle")}
        </p>
      </div>

      <OnboardingChecklistFromState tradeCount={tradeCount} />

      <SmartActions userState="NyBruker" compact />

      {/* DemoChart fjernet — viste fake generert kurve, ikke ekte data */}
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarded state — few trades, learning                             */
/* ------------------------------------------------------------------ */
function OnboardedView({ userId, stats, userName, preferredTradingMode }: { userId: string; stats: UserStats | null; userName?: string | null; preferredTradingMode: "paper" | "live" }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.adaptive");
  const isLive = preferredTradingMode === "live";
  const { formatByMode } = useCurrency();

  const displayStats = stats
    ? [
        {
          label: t("trades"),
          value: String(stats.totalTrades),
          subtext: t("total"),
          trend: "neutral" as const,
          icon: BarChart3,
        },
        {
          label: t("winRate"),
          value: `${Math.round(stats.winRate * 100)}%`,
          subtext: t("ofTotal"),
          trend: stats.winRate >= 50 ? ("up" as const) : ("down" as const),
          icon: TrendingUp,
        },
        {
          label: t("pnl"),
          value: `${stats.totalPnl >= 0 ? "+" : ""}${formatByMode(Math.abs(stats.totalPnl), preferredTradingMode)}`,
          subtext: t("return"),
          trend: stats.totalPnl >= 0 ? ("up" as const) : ("down" as const),
          icon: Wallet,
        },
      ]
    : [];

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">
          {userName
            ? t("greatWorkTitle", { userName })
            : t("greatWorkTitle", { userName: "" }).replace(", ", "")}
        </h2>
        <p className="text-sm text-slate-400">
          {t("greatWorkSubtitle")}
        </p>
      </div>

      <OnboardingChecklistFromState tradeCount={stats?.totalTrades ?? 0} />

      {stats && (
        <>
          <StatsGrid stats={displayStats} />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {t("activeSessionsTitle")}
            </h3>
            <PaperTradingList 
              sessions={stats.recentSessions || []} 
              balance={stats.currentCapital} 
              locale={locale}
              userId={userId}
              sessionMode={preferredTradingMode}
            />
          </div>

          <AITip
            winRate={stats.winRate}
            totalPnl={stats.totalPnl}
            totalTrades={stats.totalTrades}
          />
        </>
      )}

      <SmartActions userState="Onboarded" compact />
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Trader — full dashboard                                     */
/* ------------------------------------------------------------------ */
function ActiveTraderView({
  userId,
  preferredTradingMode,
  stats,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  cmsData,
  isPriority,
  userName,
}: Omit<AdaptiveDashboardProps, "userState" | "userName"> & { userName?: string | null }) {
  // Delegate to the existing rich DashboardPro for active traders
  return (
    <DashboardPro
      userId={userId}
      preferredTradingMode={preferredTradingMode}
      stats={stats}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      cmsData={cmsData}
      isPriority={isPriority}
      userName={userName ?? undefined}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Power User — full dashboard + AI tip + leaderboard CTA             */
/* ------------------------------------------------------------------ */
function PowerUserView(props: Omit<AdaptiveDashboardProps, "userState" | "userName"> & { userName?: string | null }) {
  const { stats } = props;
  const locale = useLocale();
  const t = useTranslations("dashboard.adaptive");

  return (
    <div className="space-y-5">
      {/* AI insight at top */}
      {stats && stats.totalTrades > 0 && (
        <AITip
          winRate={stats.winRate}
          totalPnl={stats.totalPnl}
          totalTrades={stats.totalTrades}
        />
      )}

      {/* Full DashboardPro */}
      <ActiveTraderView {...props} />

      {/* Extra power-user CTA */}
      <Link
        href={`/${locale}/leaderboard`}
        prefetch={false}
        className="block glass-card p-4 border-amber-500/20 hover:border-amber-500/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              {t("leaderboardTitle")}
            </h4>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {t("leaderboardDesc")}
            </p>
          </div>
          <span
            className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            {t("leaderboardCta")}
          </span>
        </div>
      </Link>

      {/* JokerTrade CTA — sekundær, under folden (progressive disclosure) */}
      <Link
        href={`/${locale}/jokertrade`}
        prefetch={false}
        className="block glass-card p-4 border-amber-500/30 hover:border-amber-500/40 transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              {t("jokerTradeTitle")}
            </h4>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {t("jokerTradeDesc")}
            </p>
          </div>
          <span
            className="btn-gold text-xs px-3 py-1.5"
          >
            {t("jokerTradeCta")}
          </span>
        </div>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Adaptive Dashboard                                           */
/* ------------------------------------------------------------------ */
export function AdaptiveDashboard({
  userId,
  userState,
  userName,
  preferredTradingMode,
  stats,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  cmsData,
  isPriority = false,
}: AdaptiveDashboardProps) {
  return (
    <AnimatePresence mode="wait">
      {userState === "NyBruker" && (
        <m.div
          key="newuser"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NewUserHero tradeCount={stats?.totalTrades ?? 0} userName={userName} preferredTradingMode={preferredTradingMode} />
        </m.div>
      )}

      {userState === "Onboarded" && (
        <m.div
          key="onboarded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <OnboardedView userId={userId} stats={stats} userName={userName} preferredTradingMode={preferredTradingMode} />
        </m.div>
      )}

      {userState === "AktivTrader" && (
        <m.div
          key="activetrader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ActiveTraderView
            userId={userId}
            userName={userName}
            preferredTradingMode={preferredTradingMode}
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
            onRetry={onRetry}
            cmsData={cmsData}
            isPriority={isPriority}
          />
        </m.div>
      )}

      {userState === "PowerUser" && (
        <m.div
          key="poweruser"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PowerUserView
            userId={userId}
            userName={userName}
            preferredTradingMode={preferredTradingMode}
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
            onRetry={onRetry}
            cmsData={cmsData}
            isPriority={isPriority}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
