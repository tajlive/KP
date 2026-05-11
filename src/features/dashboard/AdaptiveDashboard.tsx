"use client";

import { m, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { TrendingUp, BarChart3, Wallet } from "lucide-react";
import type { UserState } from "@/hooks/useUserState";
import { SimplifiedHero } from "./SimplifiedHero";
import { StatsGrid } from "./StatsGrid";
import { AITip } from "./AITip";
import { SmartActions } from "./SmartActions";
import { useCurrency } from "@/hooks/useCurrency";

import { DashboardPro } from "./DashboardPro";
import type { DashboardCmsData } from "./DashboardContent";

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
  recentSessions?: any[];
}

import { PaperTradingList } from "@/features/paper-trading/PaperTradingList";

/* ------------------------------------------------------------------ */
/*  Progress indicator (onboarding)                                    */
/* ------------------------------------------------------------------ */
function OnboardingProgress({ step }: { step: number }) {
  const locale = useLocale();
  const isNo = locale === "no";
  const steps = [
    isNo ? "Opprett konto" : "Create account",
    isNo ? "Start paper-trading" : "Start paper trading",
    isNo ? "Gjennomfør 5 trades" : "Complete 5 trades",
    isNo ? "Gå live" : "Go live",
  ];

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{isNo ? "Fremgang" : "Progress"}</span>
        <span>
          {step}/{steps.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-emerald-500" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state hero (new users)                                       */
/* ------------------------------------------------------------------ */
function NewUserHero({ userName, preferredTradingMode }: { userName?: string | null; preferredTradingMode: "paper" | "live" }) {
  const locale = useLocale();
  const isNo = locale === "no";
  const isLive = preferredTradingMode === "live";

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          {isNo
            ? `Velkommen${userName ? `, ${userName}` : ""}`
            : `Welcome${userName ? `, ${userName}` : ""}`}
        </h2>
        <p className="text-slate-400 max-w-md mx-auto">
          {isNo
            ? "Start din trading-reise her. Øv deg risikofritt med paper-trading før du går live."
            : "Start your trading journey here. Practice risk-free with paper trading before going live."}
        </p>
      </div>

      <OnboardingProgress step={isLive ? 3 : 1} />

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
  const isNo = locale === "no";
  const isLive = preferredTradingMode === "live";
  const { formatByMode } = useCurrency();

  const displayStats = stats
    ? [
        {
          label: isNo ? "Trades" : "Trades",
          value: String(stats.totalTrades),
          subtext: isNo ? "Totalt" : "Total",
          trend: "neutral" as const,
          icon: BarChart3,
        },
        {
          label: isNo ? "Win Rate" : "Win Rate",
          value: `${stats.winRate}%`,
          subtext: isNo ? "Av totalt" : "Of total",
          trend: stats.winRate >= 50 ? ("up" as const) : ("down" as const),
          icon: TrendingUp,
        },
        {
          label: isNo ? "P&L" : "P&L",
          value: `${stats.totalPnl >= 0 ? "+" : ""}${formatByMode(Math.abs(stats.totalPnl), preferredTradingMode)}`,
          subtext: isNo ? "Avkastning" : "Return",
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
          {isNo
            ? `Godt jobbet${userName ? `, ${userName}` : ""}`
            : `Great work${userName ? `, ${userName}` : ""}`}
        </h2>
        <p className="text-sm text-slate-400">
          {isNo
            ? "Du har kommet i gang. Fortsett å lære og bygg erfaring."
            : "You're off to a good start. Keep learning and building experience."}
        </p>
      </div>

      <OnboardingProgress step={isLive ? 3 : 2} />

      {stats && (
        <>
          <StatsGrid stats={displayStats} />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {isNo ? "Dine aktive sesjoner" : "Your active sessions"}
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
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Power User — full dashboard + AI tip + leaderboard CTA             */
/* ------------------------------------------------------------------ */
function PowerUserView(props: Omit<AdaptiveDashboardProps, "userState" | "userName"> & { userName?: string | null }) {
  const { stats } = props;
  const locale = useLocale();
  const isNo = locale === "no";

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
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              {isNo ? "🏆 Leaderboard" : "🏆 Leaderboard"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNo
                ? "Sammenlign deg med andre tradere og klatre på rangeringen."
                : "Compare yourself with other traders and climb the ranks."}
            </p>
          </div>
          <a
            href={`/${locale}/leaderboard`}
            className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            {isNo ? "Se rangering →" : "View ranking →"}
          </a>
        </div>
      </m.div>
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
          <NewUserHero userName={userName} preferredTradingMode={preferredTradingMode} />
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
