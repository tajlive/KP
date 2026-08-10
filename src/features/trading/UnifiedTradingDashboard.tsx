"use client";

import type { ReactNode } from "react";
import { AutoTradingConfigCard } from "@/features/trading";
import { PaperTradingCard } from "@/features/dashboard/PaperTradingCard";
import { PulseChartContainer } from "@/features/dashboard/pulse/PulseChartContainer";
import { GamificationCard } from "@/features/account/gamification/GamificationCard";
import { KLTWallet } from "@/features/account/gamification/KLTWallet";
import type {
  Portfolio,
  StrategyType,
  Trade,
  TradingMode,
  UserStrategy,
} from "@/lib/trading-api";
import { useDashboardData } from "./hooks/useDashboardData";
import { useStrategyActions } from "./hooks/useStrategyActions";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { DashboardLoadingSkeleton } from "./components/DashboardLoadingSkeleton";
import { DashboardBotStatusView } from "./components/DashboardBotStatusView";

import { useTranslations } from "next-intl";
import { DataFreshnessBadge } from "@/shared/ui/DataFreshnessBadge";
import {
  AlertTriangle,
  BarChart3,
  Grid3X3,
  Target,
  Shield,
  TrendingUp,
  Bot,
  Brain,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrency } from "@/hooks/useCurrency";
import { useTradingMode } from "@/lib/hooks/useTradingMode";
import TradingModeToggle from "./TradingModeToggle";
import { CurrencySwitcher } from "./CurrencySwitcher";
import InteractiveOnboardingWizard from "../onboarding/InteractiveOnboardingWizard";

import { SignalFeed } from "./SignalFeed";
import { MonthlyCompetitionBanner } from "@/features/account/gamification/MonthlyCompetitionBanner";
import { SURFACE } from "@/lib/design/tokens";
import {
  STRATEGY_DEFS_FOR_DASHBOARD,
  getDefaultStrategyDashboardConfigs,
} from "@/lib/auto-trading/strategy-catalog";
import { RobotThinkingStrip } from "@/features/trading/RobotThinkingStrip";
import { RecentTradesTable } from "@/features/trading/components/RecentTradesTable";
import { TradeDetailsDrawer } from "@/features/trading/components/TradeDetailsDrawer";
import { TopAIInsightsRow } from "@/features/trading/TopAIInsightsRow";
import { PortfolioSection } from "./components/PortfolioSection";
import { ConnectKrakenModal } from "@/shared/ui/modals/ConnectKrakenModal";
import { toast } from "sonner";
import { ActiveStrategiesSection } from "./components/ActiveStrategiesSection";
import { StrategySelectorSection } from "./components/StrategySelectorSection";
import { WidgetErrorBoundary } from "@/shared/ui/WidgetErrorBoundary";

// TODO(data-source-audit): PortfolioSection shows portfolio.total_pnl from useDashboardData
// while dashboardMetrics.totalPnl (from getUserDashboardMetrics) is shown in
// DashboardBotStatusView. These can differ; consolidate to one source when refactoring
// the trading desk.

const STRATEGY_ICONS: Record<StrategyType, ReactNode> = {
  dca_trygg: <Shield className="w-5 h-5" />,
  trend_balansert: <TrendingUp className="w-5 h-5" />,
  multisignal_aktiv: <Target className="w-5 h-5" />,
  simple_grid: <Zap className="w-5 h-5" />,
  grid_bot: <Grid3X3 className="w-5 h-5" />,
  ensemble_ai: <Brain className="w-5 h-5" />,
  ai_copy: <Bot className="w-5 h-5" />,
};

const STRATEGY_DEFS = STRATEGY_DEFS_FOR_DASHBOARD;


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

  const [userId] = useState<string | null>(initialUserId ?? null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

  const {
    portfolio,
    trades,
    activeStrategies,
    loading,
    showWizard,
    setShowWizard,
    loadData,
  } = useDashboardData({
    mode,
    userId,
    initialPortfolio: initialPortfolio as Portfolio | null,
    initialTrades: initialTrades as Trade[],
    initialStrategies: initialStrategies as UserStrategy[],
  });

  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading]);

  const { isStarting, handleStartStrategy, handleStopStrategy } = useStrategyActions({
    mode,
    strategyConfigs,
    onSuccess: loadData,
  });
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [tradeModeFilter, setTradeModeFilter] = useState<TradingMode | "all">("all");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const tTrading = useTranslations("trading");
  const { format: formatNOK } = useCurrency();
  const { canSwitchToLive, switchMode } = useTradingMode();

  // Enforce live requirements (tier + Kraken) before switching mode
  const handleModeChange = useCallback(
    (newMode: TradingMode) => {
      if (newMode === "live" && !canSwitchToLive) {
        toast.error(tTrading("connectKrakenRequired"), {
          description: tTrading("connectKrakenDescription"),
          action: {
            label: tTrading("connectNow"),
            onClick: () => setShowConnectModal(true),
          },
        });
        return;
      }
      setMode(newMode);
      void switchMode(newMode);
    },
    [canSwitchToLive, switchMode, tTrading, setShowConnectModal],
  );

  const STRATEGIES = STRATEGY_DEFS.map((s) => ({
    ...s,
    icon: STRATEGY_ICONS[s.type],
    name: tTrading(`strategies.${s.type}.name`),
    description: tTrading(`strategies.${s.type}.description`),
  }));

  // Fetch unified metrics for single source of truth — MUST be before early returns
  const { data: dashboardMetrics } = useDashboardMetrics(mode, "active_and_completed", {
    enabled: !!userId,
  });

  if (loading) {
    return <DashboardLoadingSkeleton />;
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
      <DashboardBotStatusView
        portfolio={portfolio}
        activeStrategies={activeStrategies}
        recentTrades={trades}
        formatNOK={formatNOK}
        userId={userId}
        mode={mode}
        onLoadData={loadData}
        onSetExpandedStrategy={setExpandedStrategy}
        dashboardMetrics={dashboardMetrics}
      />
    );
  }

  return (
    <WidgetErrorBoundary
      title="Handelspanelet kunne ikke lastes"
      message="Vi kunne ikke vise handelsdashbordet akkurat nå. Prøv på nytt."
      retryLabel="Last på nytt"
      onReset={loadData}
      resetKeys={[mode, userId ?? ""]}
    >
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
            <DataFreshnessBadge timestamp={lastUpdated} variant="pnl" />
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
              onToggle={handleModeChange}
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
        <PortfolioSection
          portfolio={portfolio}
          trades={trades}
          activeStrategies={activeStrategies}
          formatNOK={formatNOK}
        />

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

        <ConnectKrakenModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      </div>
    </div>
    </WidgetErrorBoundary>
  );
}

