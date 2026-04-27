"use client";

import type { ReactNode } from "react";
import { AutoTradingConfigCard } from "@/features/dashboard/AutoTradingConfigCard";
import { PaperTradingCard } from "@/features/dashboard/PaperTradingCard";
import { PulseChartContainer } from "@/features/dashboard/pulse/PulseChartContainer";
import { GamificationCard } from "@/features/gamification/GamificationCard";
import { KLTWallet } from "@/features/gamification/KLTWallet";
import { useI18nToast } from "@/hooks/useI18nToast";
import {
  getActiveStrategies,
  getPortfolio,
  getRecentTrades,
  mergeTradeIntoList,
  startStrategy,
  stopStrategy,
  subscribeToTrades,
  type Portfolio,
  type StrategyType,
  type Trade,
  type TradingMode,
  type UserStrategy,
} from "@/lib/trading-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { TRADING_INTEGRITY_SYNC } from "@/lib/trading/trading-integrity-sync";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Grid3X3,
  Play,
  Square,
  Target,
  Shield,
  TrendingUp,
  Wallet,
  Bot,
  Brain,
  Lightbulb,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrency } from "@/hooks/useCurrency";
import { useTradingMode } from "@/lib/hooks/useTradingMode";
import TradingModeToggle from "./TradingModeToggle";
import { CurrencySwitcher } from "./CurrencySwitcher";
import InteractiveOnboardingWizard from "../onboarding/InteractiveOnboardingWizard";
import BotStatusDashboard from "./BotStatusDashboard";
import { SignalFeed } from "./SignalFeed";
import { MonthlyCompetitionBanner } from "@/features/gamification/MonthlyCompetitionBanner";
import { BRAND, SURFACE, RADIUS } from "@/lib/design/tokens";
import {
  STRATEGY_DEFS_FOR_DASHBOARD,
  getDefaultStrategyDashboardConfigs,
} from "@/lib/auto-trading/strategy-catalog";
import { RobotThinkingStrip } from "@/features/trading/RobotThinkingStrip";
import { RecentTradesTable } from "@/features/trading/components/RecentTradesTable";
import { TradeDetailsDrawer } from "@/features/trading/components/TradeDetailsDrawer";
import { TopAIInsightsRow } from "@/features/trading/TopAIInsightsRow";
import { TradingModeSelector } from "@/features/trading/components/TradingModeSelector";

const STRATEGY_ICONS: Record<StrategyType, ReactNode> = {
  dca_trygg: <Shield className="w-5 h-5" />,
  trend_balansert: <TrendingUp className="w-5 h-5" />,
  multisignal_aktiv: <Target className="w-5 h-5" />,
  grid_bot: <Grid3X3 className="w-5 h-5" />,
  ensemble_ai: <Brain className="w-5 h-5" />,
  ai_copy: <Bot className="w-5 h-5" />,
};

const STRATEGY_DEFS = STRATEGY_DEFS_FOR_DASHBOARD;

const RISK_COLORS: Record<number, string> = {
  1: "text-green-400",
  2: "text-blue-400",
  3: "text-yellow-400",
  4: "text-orange-400",
  5: "text-red-400",
};

// Helper function to check if user has completed setup (localStorage only, Supabase checked async)
const hasLocalSetup = (userId: string): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`auto-trading-setup-${userId}`) === "completed";
};

interface DashboardProps {
  initialPortfolio?: unknown;
  initialTrades?: unknown[];
  initialStrategies?: unknown[];
  userId?: string;
  /** Én trading-side: initial mode from URL (?mode=live) */
  initialMode?: TradingMode;
}

export default function UnifiedTradingDashboard({
  initialPortfolio,
  initialTrades,
  initialStrategies,
  userId: initialUserId,
  initialMode = "paper",
}: DashboardProps = {}) {
  const [mode, setMode] = useState<TradingMode>(initialMode);
  /** Synk med realtime trade-handler — brukes for å vite om portefølje skal hentes på nytt */
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const router = useRouter();
  const pathname = usePathname() ?? "";

  // Synk URL med modus (paper/live) for tydelig UX og tier-gate
  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const wantLive = mode === "live";
    const hasLive = params.get("mode") === "live";
    if (wantLive !== hasLive) {
      const next = new URL(pathname, "http://localhost");
      if (wantLive) next.searchParams.set("mode", "live");
      else next.searchParams.delete("mode");
      const q = next.searchParams.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [mode, pathname, router]);

  const [portfolio, setPortfolio] = useState<Portfolio | null>(
    (initialPortfolio as Portfolio | null) ?? null,
  );
  const [trades, setTrades] = useState<Trade[]>(
    (initialTrades as Trade[]) ?? [],
  );
  const [activeStrategies, setActiveStrategies] = useState<UserStrategy[]>(
    (initialStrategies as UserStrategy[]) ?? [],
  );
  const [loading, setLoading] = useState(!initialPortfolio);
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [showWizard, setShowWizard] = useState(false);
  const [expandedStrategy, setExpandedStrategy] = useState<StrategyType | null>(
    null,
  );
  const [strategyConfigs, setStrategyConfigs] = useState<
    Record<StrategyType, Record<string, unknown>>
  >(
    () =>
      getDefaultStrategyDashboardConfigs() as Record<
        StrategyType,
        Record<string, unknown>
      >,
  );

  const { error: showError } = useI18nToast();
  const [isStarting, setIsStarting] = useState<StrategyType | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [tradeModeFilter, setTradeModeFilter] = useState<TradingMode | "all">("all");
  const { success: showSuccess, error: showToastError } = useI18nToast();
  const tTrading = useTranslations("trading");
  const { format: formatNOK } = useCurrency();
  const { mode: tradingModeState, canSwitchToLive, switchMode } = useTradingMode();

  const STRATEGIES = STRATEGY_DEFS.map((s) => ({
    ...s,
    icon: STRATEGY_ICONS[s.type],
    name: tTrading(`strategies.${s.type}.name`),
    description: tTrading(`strategies.${s.type}.description`),
  }));

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [port, trd, active] = await Promise.all([
        getPortfolio(mode),
        getRecentTrades({ limit: 100 }),
        getActiveStrategies(mode),
      ]);
      setPortfolio(port);
      setTrades(trd);
      setActiveStrategies(active);

      // KLA-55 + KLA-70: Show wizard if no active strategies and user hasn't completed setup
      if (userId && active.length === 0 && !hasLocalSetup(userId)) {
        // Check onboarding_progress for server-side persistence
        const sb = getSupabaseClient();
        const { data: progress } = await sb
          .from("onboarding_progress")
          .select("is_completed")
          .eq("user_id", userId)
          .maybeSingle();
        if (!progress?.is_completed) {
          setShowWizard(true);
        } else {
          // Sync localStorage from Supabase
          localStorage.setItem(`auto-trading-setup-${userId}`, "completed");
        }
      }
    } catch (err) {
      console.error("Failed to load trading data:", err);
      showError("toasts.general.error");
    } finally {
      setLoading(false);
    }
  }, [mode, userId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Etter nye/oppdaterte trades må sesjonsaggregater hentes på nytt — ellers forblir P&L/saldo «frosset». */
  const portfolioRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const schedulePortfolioSyncAfterTrade = useCallback(() => {
    if (portfolioRefreshTimerRef.current) {
      clearTimeout(portfolioRefreshTimerRef.current);
    }
    portfolioRefreshTimerRef.current = setTimeout(() => {
      portfolioRefreshTimerRef.current = null;
      void (async () => {
        try {
          const m = modeRef.current;
          const [port, active] = await Promise.all([
            getPortfolio(m),
            getActiveStrategies(m),
          ]);
          setPortfolio(port);
          setActiveStrategies(active);
        } catch (e) {
          console.error("Portfolio sync after trade failed:", e);
        }
      })();
    }, 400);
  }, []);

  useEffect(() => {
    if (!userId) {
      const getUser = async () => {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      };
      getUser();
      return;
    }

    const unsubscribe = subscribeToTrades(null, userId, (newTrade, _kind) => {
      setTrades((prev) => mergeTradeIntoList(prev, newTrade));
      if (newTrade.mode === modeRef.current) {
        schedulePortfolioSyncAfterTrade();
      }
      // Ikke toast ved Realtime INSERT: brukere tolker det som «min ordre ble utført».
      // Bekreftelse skal komme fra handlingen (f.eks. /api/paper-trading/execute), ikke fra bakgrunnssynk.
    });

    return () => {
      if (portfolioRefreshTimerRef.current) {
        clearTimeout(portfolioRefreshTimerRef.current);
        portfolioRefreshTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [userId, schedulePortfolioSyncAfterTrade]);

  /** Poll + visibility: sikrer at handler og sesjons-PnL ikke «fryser» når Realtime mangler. */
  useEffect(() => {
    if (!userId) return;
    let iv: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      try {
        const rows = await getRecentTrades({ limit: 50 });
        setTrades(rows);
        const m = modeRef.current;
        const [port, active] = await Promise.all([
          getPortfolio(m),
          getActiveStrategies(m),
        ]);
        setPortfolio(port);
        setActiveStrategies(active);
      } catch (e) {
        console.error("[UnifiedTradingDashboard] integrity poll:", e);
      }
    };

    const start = () => {
      if (iv) clearInterval(iv);
      void poll();
      iv = setInterval(
        () => void poll(),
        TRADING_INTEGRITY_SYNC.tradesPollIntervalMs,
      );
    };

    const stop = () => {
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [userId]);

  const handleStartStrategy = async (strategyType: StrategyType) => {
    try {
      setIsStarting(strategyType);
      const config = strategyConfigs[strategyType] as Record<string, unknown>;
      await startStrategy(strategyType, mode, config);

      // Trigger immediate execution via Edge Function
      const response = await fetch("/api/trading/trigger", { method: "POST" });
      if (!response.ok) {
        console.warn("Manual trigger failed:", await response.text());
      }

      showSuccess("toasts.strategy.started");
      loadData();
    } catch (_) {
      showToastError("toasts.strategy.startFailed");
    } finally {
      setIsStarting(null);
    }
  };

  const handleStopStrategy = async (strategyType: StrategyType) => {
    try {
      await stopStrategy(strategyType, mode);
      showSuccess("toasts.strategy.stopped");
      loadData();
    } catch (_) {
      showToastError("toasts.strategy.stopFailed");
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${SURFACE.BG} p-6`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div
            className={`h-8 ${SURFACE.BG_ELEVATED} ${RADIUS.input} animate-pulse w-1/3`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-24 ${SURFACE.BG_ELEVATED} ${RADIUS.card} animate-pulse`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // KLA-98: Show InteractiveOnboardingWizard if user hasn't completed setup and has no active strategies
  if (showWizard && userId) {
    return (
      <div className={`min-h-screen ${SURFACE.BG}`}>
        <InteractiveOnboardingWizard
          userId={userId}
          onComplete={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      </div>
    );
  }

  // KLA-100: Show BotStatusDashboard if a bot is active
  if (activeStrategies.length > 0 && userId) {
    return (
      <BotStatusDashboard
        portfolio={portfolio}
        activeStrategies={activeStrategies}
        recentTrades={trades}
        formatNOK={formatNOK}
        userId={userId}
        onAction={async (action) => {
          if (action === "pause" || action === "stop_all") {
            await Promise.all(
              activeStrategies.map((s) => stopStrategy(s.strategy_id, mode)),
            );
            showSuccess("strategy.stopped");
            loadData();
          } else if (action === "start_new" || action === "new_strategy") {
            setExpandedStrategy(null);
            showSuccess("toasts.general.comingSoon");
          } else if (action === "view_stats") {
            showSuccess("toasts.general.comingSoon");
          }
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${SURFACE.BG} p-6`}
      data-testid="dashboard-root"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className={`text-2xl font-bold ${SURFACE.TEXT} flex items-center gap-2`}
            >
              <BarChart3 className="w-6 h-6 text-[#3d7aff]" aria-hidden />
              {tTrading("unifiedHubTitle")}
            </h1>
            <p className={`${SURFACE.TEXT_MUTED} text-sm mt-1 max-w-xl`}>
              {tTrading("unifiedHubSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={`/${(pathname ?? "").split("/")[1] ?? "no"}/dashboard`}
              className={`text-sm font-medium ${SURFACE.TEXT_MUTED} hover:text-white transition-colors`}
            >
              {tTrading("backToDashboard")}
            </a>
            <a
              href={`${pathname}?view=sessions${mode === "live" ? "&mode=live" : ""}`}
              className={`text-sm font-medium ${SURFACE.TEXT_MUTED} hover:text-white transition-colors`}
            >
              {tTrading("mySessions")}
            </a>
            <CurrencySwitcher layoutId="unified-trading-currency" />
            <TradingModeToggle
              mode={mode}
              onToggle={setMode}
              paperLabel={tTrading("paperModeShort")}
              liveLabel={tTrading("liveModeShort")}
              ariaLabel={tTrading("toggleAria")}
            />
          </div>
        </div>

        {/* 50k KLT monthly prize – synlig på dashboard */}
        <MonthlyCompetitionBanner />

        <RobotThinkingStrip />

        {/* Mode Warning */}
        {mode === "live" && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{tTrading("liveRiskBanner")}</p>
          </div>
        )}

        {/* Portfolio Summary */}
        <PortfolioSection portfolio={portfolio} formatNOK={formatNOK} />

        {/* Pulse Section - KLA-134 */}
        <section className="space-y-4">
          <PulseChartContainer />
        </section>

        {/* TOP AI Insights */}
        <TopAIInsightsRow />

        {/* Trading Signals */}
        <SignalFeed />

        {/* Gamification & KLT Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KLTWallet />
          <GamificationCard />
        </div>

        {/* Auto Trading Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AutoTradingConfigCard />
          <PaperTradingCard />
        </div>

        {/* Active Strategies */}
        <ActiveStrategiesSection
          activeStrategies={activeStrategies}
          onStop={handleStopStrategy}
          formatNOK={formatNOK}
          strategies={STRATEGIES}
        />

        {/* Trading Mode Selector */}
        <TradingModeSelector
          mode={mode}
          onChange={(newMode) => {
            setMode(newMode);
            void switchMode(newMode);
          }}
          hasExchangeConnection={canSwitchToLive}
          isLiveEnabled={canSwitchToLive}
        />

        {/* Recent Trades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{tTrading("recentTradesPanel.title")}</h2>
          </div>
          <RecentTradesTable
            trades={trades}
            onSelectTrade={setSelectedTradeId}
            selectedTradeId={selectedTradeId}
            modeFilter={tradeModeFilter}
            onModeFilterChange={setTradeModeFilter}
          />
        </div>

        {/* Trade Details Drawer */}
        <TradeDetailsDrawer
          tradeId={selectedTradeId}
          onClose={() => setSelectedTradeId(null)}
        />

        {/* Strategy Selector */}
        <StrategySelectorSection
          strategies={STRATEGIES}
          activeStrategies={activeStrategies}
          expandedStrategy={expandedStrategy}
          setExpandedStrategy={setExpandedStrategy}
          strategyConfigs={strategyConfigs}
          setStrategyConfigs={setStrategyConfigs}
          onStart={handleStartStrategy}
          onStop={handleStopStrategy}
          mode={mode}
          isStarting={isStarting}
        />
      </div>
    </div>
  );
}

import dynamic from "next/dynamic";

function ChartLoadingFallback() {
  const t = useTranslations("trading.desk");
  return (
    <div className="w-full h-[400px] bg-slate-800/50 rounded-xl animate-pulse flex items-center justify-center border border-slate-700/40">
      <span className="text-slate-400 text-sm">{t("chartLoading")}</span>
    </div>
  );
}

const ProfessionalChart = dynamic(() => import("./ProfessionalChart"), {
  ssr: false,
  loading: () => <ChartLoadingFallback />,
});

function PortfolioSection({
  portfolio,
  formatNOK,
}: {
  portfolio: Portfolio | null;
  formatNOK: (v: number) => string;
}) {
  const t = useTranslations("trading.desk");
  if (!portfolio) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-300">{t("welcomeEmpty")}</p>
      </div>
    );
  }

  const isProfit = portfolio.total_pnl >= 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <Wallet className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("totalValue")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {formatNOK(portfolio.total_value)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <DollarSign className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("cash")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {formatNOK(portfolio.cash_balance)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <BarChart3 className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("pnl")}</span>
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
          >
            {isProfit ? "+" : ""}
            {formatNOK(portfolio.total_pnl)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
            <TrendingUp className="w-4 h-4 shrink-0" aria-hidden />
            <span>{t("winRate")}</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {(portfolio.win_rate ?? 0).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="w-full">
        <ProfessionalChart />
      </div>
    </div>
  );
}

function ActiveStrategiesSection({
  activeStrategies,
  onStop,
  formatNOK,
  strategies: STRATEGIES,
}: {
  activeStrategies: UserStrategy[];
  onStop: (type: StrategyType) => void;
  formatNOK: (v: number) => string;
  strategies: {
    type: StrategyType;
    icon: ReactNode;
    risk: number;
    name: string;
    description: string;
  }[];
}) {
  const t = useTranslations("trading.activeStrategiesPanel");
  if (activeStrategies.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">{t("title")}</h2>
        <p className="text-slate-300 text-sm">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{t("title")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeStrategies.map((strategy) => {
          const info = STRATEGIES.find((s) => s.type === strategy.strategy_id);
          return (
            <div
              key={strategy.id}
              className="bg-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-300">
                  {info?.icon}
                  <span className="font-medium text-white">{info?.name}</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  {t("pnlLine", {
                    pnl: formatNOK(strategy.total_pnl),
                    count: strategy.total_trades,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStop(strategy.strategy_id)}
                className="px-4 py-2 min-h-[44px] bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm font-medium"
              >
                {t("stop")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentTradesSection({
  trades,
  formatNOK,
}: {
  trades: Trade[];
  formatNOK: (v: number) => string;
}) {
  const t = useTranslations("trading.recentTradesPanel");
  const tTrading = useTranslations("trading");

  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">{t("title")}</h2>
        <p className="text-slate-300 text-sm">{t("empty")}</p>
      </div>
    );
  }

  const hasMixedModes =
    trades.some((x) => x.mode === "paper") &&
    trades.some((x) => x.mode === "live");

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
        {hasMixedModes ? (
          <p className="text-slate-400 text-xs max-w-md text-right">
            {tTrading("recentTradesMixedModesHint")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {trades.map((trade) => {
            const isProfit = (trade.realized_pnl || 0) >= 0;
            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="bg-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${trade.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {trade.side === "buy" ? t("sideBuy") : t("sideSell")}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{trade.symbol}</p>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-slate-500/35 bg-slate-700/50 text-slate-200">
                        {trade.mode === "live"
                          ? tTrading("liveModeShort")
                          : tTrading("paperModeShort")}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      {(trade.strategy_signal?.strategy_type as string) ||
                        t("unknownStrategy")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium tabular-nums ${isProfit ? "text-green-400" : "text-red-400"}`}
                  >
                    {isProfit ? "+" : ""}
                    {formatNOK(trade.realized_pnl || 0)}
                  </p>
                  <p className="text-slate-400 text-xs tabular-nums">
                    {formatNOK(trade.total_value)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StrategySelectorSection({
  strategies,
  activeStrategies,
  expandedStrategy,
  setExpandedStrategy,
  strategyConfigs,
  setStrategyConfigs,
  onStart,
  onStop,
  mode,
  isStarting,
}: {
  strategies: {
    type: StrategyType;
    icon: ReactNode;
    risk: number;
    name: string;
    description: string;
  }[];
  activeStrategies: UserStrategy[];
  expandedStrategy: StrategyType | null;
  setExpandedStrategy: (t: StrategyType | null) => void;
  strategyConfigs: Record<StrategyType, Record<string, unknown>>;
  setStrategyConfigs: React.Dispatch<
    React.SetStateAction<Record<StrategyType, Record<string, unknown>>>
  >;
  onStart: (t: StrategyType) => void;
  onStop: (t: StrategyType) => void;
  mode: TradingMode;
  isStarting: StrategyType | null;
}) {
  const isActive = (type: StrategyType) =>
    activeStrategies.some((s) => s.strategy_id === type);

  const t = useTranslations("trading.strategyPicker");

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{t("title")}</h2>

      {mode === "paper" && (
        <p className={`mb-4 flex items-center gap-2 text-sm ${BRAND.link}`}>
          <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t("paperHint")}</span>
        </p>
      )}

      <div className="space-y-3">
        {strategies.map((strategy) => {
          const active = isActive(strategy.type);
          const expanded = expandedStrategy === strategy.type;

          return (
            <div
              key={strategy.type}
              className="bg-slate-700 rounded-lg overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-600 transition gap-3"
                onClick={() =>
                  setExpandedStrategy(expanded ? null : strategy.type)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedStrategy(expanded ? null : strategy.type);
                  }
                }}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? t("ariaClose")
                    : t("ariaSelect", { name: strategy.name })
                }
              >
                <div className="flex items-center gap-3 text-slate-300">
                  {strategy.icon}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">
                        {strategy.name}
                      </span>
                      <div className="flex" aria-hidden>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < strategy.risk
                                ? RISK_COLORS[strategy.risk]
                                : "text-slate-600"
                            }`}
                            fill={i < strategy.risk ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm truncate">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  {active ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {t("statusActive")}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">
                      {t("statusIdle")}
                    </span>
                  )}
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-slate-600">
                      <StrategyConfig
                        type={strategy.type}
                        config={strategyConfigs[strategy.type]}
                        onChange={(newConfig) =>
                          setStrategyConfigs((prev) => ({
                            ...prev,
                            [strategy.type]: newConfig,
                          }))
                        }
                      />
                      <div className="flex gap-3 mt-4">
                        {active ? (
                          <button
                            type="button"
                            onClick={() => onStop(strategy.type)}
                            className="h-full flex-1 py-3 min-h-[44px] rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition flex items-center justify-center gap-2 font-semibold border border-red-500/25"
                          >
                            <Square className="w-4 h-4" aria-hidden />
                            {t("stopStrategy")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStart(strategy.type)}
                            disabled={isStarting === strategy.type}
                            className="flex-1 py-3 min-h-[44px] bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                          >
                            {isStarting === strategy.type ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                {t("starting")}
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" aria-hidden />
                                {t("startStrategy")}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyConfig({
  type,
  config,
  onChange,
}: {
  type: StrategyType;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const tCommon = useTranslations("trading");

  switch (type) {
    case "dca_trygg": {
      const dcaConfig = config as {
        weeklyAmount: number;
        btcAllocation: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="dca-weekly-amount"
              className="text-slate-400 text-sm"
            >
              Ukentlig beløp: {dcaConfig.weeklyAmount} NOK
            </label>
            <input
              id="dca-weekly-amount"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={dcaConfig.weeklyAmount}
              title="Ukentlig beløp"
              onChange={(e) =>
                onChange({ ...config, weeklyAmount: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="dca-btc-allocation"
              className="text-slate-400 text-sm"
            >
              BTC-fordeling: {dcaConfig.btcAllocation}%
            </label>
            <input
              id="dca-btc-allocation"
              type="range"
              min="0"
              max="100"
              value={dcaConfig.btcAllocation}
              title="BTC-fordeling"
              onChange={(e) =>
                onChange({ ...config, btcAllocation: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    case "trend_balansert": {
      const trendConfig = config as { riskPerTrade: number; stopLoss: number };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="trend-risk-per-trade"
              className="text-slate-400 text-sm"
            >
              Risiko per trade: {trendConfig.riskPerTrade}%
            </label>
            <input
              id="trend-risk-per-trade"
              type="range"
              min="1"
              max="5"
              value={trendConfig.riskPerTrade}
              title="Risiko per trade"
              onChange={(e) =>
                onChange({ ...config, riskPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="trend-stop-loss" className="text-slate-400 text-sm">
              Stop-loss: {trendConfig.stopLoss}%
            </label>
            <input
              id="trend-stop-loss"
              type="range"
              min="5"
              max="15"
              value={trendConfig.stopLoss}
              title="Stop-loss"
              onChange={(e) =>
                onChange({ ...config, stopLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    case "multisignal_aktiv": {
      const multiConfig = config as { aggressiveness: string };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="multi-aggressiveness"
              className="text-slate-400 text-sm"
            >
              {tCommon("aggressiveness")}
            </label>
            <select
              id="multi-aggressiveness"
              value={multiConfig.aggressiveness}
              title={tCommon("aggressiveness")}
              onChange={(e) =>
                onChange({ ...config, aggressiveness: e.target.value })
              }
              className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
            >
              <option value="forsiktig">{tCommon("conservativeOption")}</option>
              <option value="normal">{tCommon("normalOption")}</option>
              <option value="aggressiv">{tCommon("aggressiveOption")}</option>
            </select>
          </div>
        </div>
      );
    }
    case "grid_bot": {
      const gridConfig = config as {
        upperPrice: number;
        lowerPrice: number;
        levels: number;
        capital: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="grid-upper-price"
                className="text-slate-400 text-sm"
              >
                Øvre pris
              </label>
              <input
                id="grid-upper-price"
                type="number"
                value={gridConfig.upperPrice}
                title="Øvre pris"
                onChange={(e) =>
                  onChange({ ...config, upperPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label
                htmlFor="grid-lower-price"
                className="text-slate-400 text-sm"
              >
                Nedre pris
              </label>
              <input
                id="grid-lower-price"
                type="number"
                value={gridConfig.lowerPrice}
                title="Nedre pris"
                onChange={(e) =>
                  onChange({ ...config, lowerPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="grid-levels" className="text-slate-400 text-sm">
              Grid-nivåer: {gridConfig.levels}
            </label>
            <input
              id="grid-levels"
              type="range"
              min="5"
              max="50"
              value={gridConfig.levels}
              title="Grid-nivåer"
              onChange={(e) =>
                onChange({ ...config, levels: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="grid-capital" className="text-slate-400 text-sm">
              Kapital: {gridConfig.capital} NOK
            </label>
            <input
              id="grid-capital"
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={gridConfig.capital}
              title="Kapital"
              onChange={(e) =>
                onChange({ ...config, capital: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    case "ai_copy": {
      const aiConfig = config as { maxPerTrade: number; maxLoss: number };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="ai-max-per-trade"
              className="text-slate-400 text-sm"
            >
              Maks per trade: {aiConfig.maxPerTrade} NOK
            </label>
            <input
              id="ai-max-per-trade"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={aiConfig.maxPerTrade}
              title="Maks per trade"
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="ai-max-loss" className="text-slate-400 text-sm">
              Maks tap: {aiConfig.maxLoss} NOK
            </label>
            <input
              id="ai-max-loss"
              type="range"
              min="100"
              max="2000"
              step="100"
              value={aiConfig.maxLoss}
              title="Maks tap"
              onChange={(e) =>
                onChange({ ...config, maxLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    case "ensemble_ai": {
      const ensembleConfig = config as { maxPerTrade: number; autoAdjust: boolean };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="ensemble-max-per-trade"
              className="text-slate-400 text-sm"
            >
              Maks per trade: {ensembleConfig.maxPerTrade} NOK
            </label>
            <input
              id="ensemble-max-per-trade"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={ensembleConfig.maxPerTrade}
              title="Maks per trade"
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ensemble-auto-adjust"
              type="checkbox"
              checked={ensembleConfig.autoAdjust}
              onChange={(e) =>
                onChange({ ...config, autoAdjust: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-600"
            />
            <label htmlFor="ensemble-auto-adjust" className="text-slate-400 text-sm">
              {tCommon("ensembleAutoAdjustWeights")}
            </label>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
