"use client";

import {
  getActiveStrategies,
  getPortfolio,
  getRecentTrades,
  startStrategy,
  stopStrategy,
  subscribeToTrades,
  type Portfolio,
  type StrategyType,
  type Trade,
  type TradingMode,
  type UserStrategy,
} from "@/lib/trading-api";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Play,
  Square,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import InteractiveOnboardingWizard from "../onboarding/InteractiveOnboardingWizard";
import BotStatusDashboard from "./BotStatusDashboard";

const STRATEGIES: {
  type: StrategyType;
  name: string;
  icon: string;
  risk: number;
  description: string;
}[] = [
  {
    type: "dca_trygg",
    name: "DCA Trygg",
    icon: "🛡️",
    risk: 1,
    description: "Kjøper BTC/ETH automatisk hver uke. Dobler ved store dip.",
  },
  {
    type: "trend_balansert",
    name: "Trend Balansert",
    icon: "📈",
    risk: 3,
    description: "Følger MA50/MA200 crossover med RSI-filter.",
  },
  {
    type: "multisignal_aktiv",
    name: "Multi-Signal Aktiv",
    icon: "⚡",
    risk: 4,
    description: "RSI + MACD + Bollinger gir hyppigere handler.",
  },
  {
    type: "grid_bot",
    name: "Grid Bot",
    icon: "🔲",
    risk: 3,
    description: "Kjøper lavt, selger høyt i prisgitter.",
  },
  {
    type: "ai_copy",
    name: "AI Copy",
    icon: "🤖",
    risk: 5,
    description: "Kopierer topp-tradere filtrert av AI.",
  },
];

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
  initialPortfolio?: any;
  initialTrades?: any[];
  initialStrategies?: any[];
  userId?: string;
}

export default function UnifiedTradingDashboard({
  initialPortfolio,
  initialTrades,
  initialStrategies,
  userId: initialUserId,
}: DashboardProps = {}) {
  const [mode, setMode] = useState<TradingMode>("paper");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(
    initialPortfolio ?? null,
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
  >({
    dca_trygg: { weeklyAmount: 1000, btcAllocation: 70 },
    trend_balansert: { riskPerTrade: 2, stopLoss: 10 },
    multisignal_aktiv: { aggressiveness: "normal" },
    grid_bot: {
      upperPrice: 70000,
      lowerPrice: 50000,
      levels: 10,
      capital: 5000,
    },
    ai_copy: { maxPerTrade: 1000, maxLoss: 500 },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [port, trd, active] = await Promise.all([
        getPortfolio(mode),
        getRecentTrades(mode, 20),
        getActiveStrategies(mode),
      ]);
      setPortfolio(port);
      setTrades(trd);
      setActiveStrategies(active);

      // KLA-55 + KLA-70: Show wizard if no active strategies and user hasn't completed setup
      if (userId && active.length === 0 && !hasLocalSetup(userId)) {
        // Check onboarding_progress for server-side persistence
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
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
      toast.error("Kunne ikke laste trading-data");
    } finally {
      setLoading(false);
    }
  }, [mode, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!userId) {
      const getUser = async () => {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      };
      getUser();
      return;
    }

    const unsubscribe = subscribeToTrades(mode, userId, (newTrade) => {
      setTrades((prev) => [newTrade, ...prev]);
      toast.success(
        `Ny handel: ${newTrade.symbol} ${newTrade.side.toUpperCase()}`,
      );
    });

    return () => unsubscribe();
  }, [mode, userId]);

  const [isStarting, setIsStarting] = useState<StrategyType | null>(null);

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

      toast.success(
        `${STRATEGIES.find((s) => s.type === strategyType)?.name} er startet! 🚀`,
      );
      loadData();
    } catch (_) {
      toast.error("Kunne ikke starte strategi");
    } finally {
      setIsStarting(null);
    }
  };

  const handleStopStrategy = async (strategyType: StrategyType) => {
    try {
      await stopStrategy(strategyType, mode);
      toast.success("Strategi stoppet");
      loadData();
    } catch (_) {
      toast.error("Kunne ikke stoppe strategi");
    }
  };

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-slate-800 rounded animate-pulse w-1/3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-slate-800 rounded animate-pulse"
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
      <div className="min-h-screen bg-slate-950">
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
            toast.success("Alle strategier er stoppet/pauset");
            loadData();
          } else if (action === "start_new" || action === "new_strategy") {
            // Option to show the full strategy selector or just onboarding again
            setExpandedStrategy(null);
            // We can just scroll to strategy selector or change a view state
            // For now, let's just toast
            toast("Vennligst velg en ny strategi i den avanserte oversikten");
          } else if (action === "view_stats") {
            // For now, just a toast
            toast("Avansert statistikk kommer snart!");
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {mode === "paper" ? "📄 Papirhandel" : "💰 Live Handel"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {mode === "paper"
                ? "Øv med virtuell kapital — 1 000 000 NOK"
                : "Handel med ekte midler"}
            </p>
          </div>
          <TradingModeToggle mode={mode} setMode={setMode} />
        </div>

        {/* Mode Warning */}
        {mode === "live" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">
              ⚠️ Du handler med ekte midler. Vær forsiktig.
            </p>
          </div>
        )}

        {/* Portfolio Summary */}
        <PortfolioSection portfolio={portfolio} formatNOK={formatNOK} />

        {/* Active Strategies */}
        <ActiveStrategiesSection
          activeStrategies={activeStrategies}
          onStop={handleStopStrategy}
          formatNOK={formatNOK}
        />

        {/* Recent Trades */}
        <RecentTradesSection trades={trades} formatNOK={formatNOK} />

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

function TradingModeToggle({
  mode,
  setMode,
}: {
  mode: TradingMode;
  setMode: (m: TradingMode) => void;
}) {
  return (
    <div
      className="relative w-[200px] h-10 bg-slate-800 rounded-full p-1 flex cursor-pointer"
      onClick={() => setMode(mode === "paper" ? "live" : "paper")}
    >
      <motion.div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
        animate={{ x: mode === "live" ? "100%" : "0%" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ left: 4 }}
      />
      <div className="flex-1 flex items-center justify-center relative z-10 text-sm font-medium">
        <span className={mode === "paper" ? "text-white" : "text-slate-400"}>
          📄 Paper
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center relative z-10 text-sm font-medium">
        <span className={mode === "live" ? "text-white" : "text-slate-400"}>
          💰 Live
        </span>
      </div>
    </div>
  );
}

function PortfolioSection({
  portfolio,
  formatNOK,
}: {
  portfolio: Portfolio | null;
  formatNOK: (v: number) => string;
}) {
  if (!portfolio) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-400">
          Velkommen! Start en strategi for å begynne.
        </p>
      </div>
    );
  }

  const isProfit = portfolio.total_pnl >= 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <Wallet className="w-4 h-4" />
          <span>Total verdi</span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-white">
          {formatNOK(portfolio.total_value)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <DollarSign className="w-4 h-4" />
          <span>Cash</span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-white">
          {formatNOK(portfolio.cash_balance)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>P&L</span>
        </div>
        <p
          className={`text-xl sm:text-2xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
        >
          {isProfit ? "+" : ""}
          {formatNOK(portfolio.total_pnl)}
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>Win Rate</span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-white">
          {portfolio.win_rate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function ActiveStrategiesSection({
  activeStrategies,
  onStop,
  formatNOK,
}: {
  activeStrategies: UserStrategy[];
  onStop: (type: StrategyType) => void;
  formatNOK: (v: number) => string;
}) {
  if (activeStrategies.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Aktive strategier
        </h2>
        <p className="text-slate-400 text-sm">
          Ingen aktive strategier. Velg en strategi nedenfor for å starte.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Aktive strategier
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeStrategies.map((strategy) => {
          const info = STRATEGIES.find((s) => s.type === strategy.strategy_id);
          return (
            <div
              key={strategy.id}
              className="bg-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info?.icon}</span>
                  <span className="font-medium text-white">{info?.name}</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  P&L: {formatNOK(strategy.total_pnl)} • {strategy.total_trades}{" "}
                  handler
                </p>
              </div>
              <button
                onClick={() => onStop(strategy.strategy_id)}
                className="px-4 py-2 min-h-[44px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition text-sm"
              >
                Stopp
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
  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Siste handler</h2>
        <p className="text-slate-400 text-sm">
          Ingen handler ennå — start din første strategi →
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Siste handler</h2>
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
                    {trade.side === "buy" ? "KJØP" : "SALG"}
                  </div>
                  <div>
                    <p className="font-medium text-white">{trade.symbol}</p>
                    <p className="text-slate-400 text-xs">
                      {(trade.strategy_signal?.strategy_type as string) ||
                        "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${isProfit ? "text-green-400" : "text-red-400"}`}
                  >
                    {isProfit ? "+" : ""}
                    {formatNOK(trade.realized_pnl || 0)}
                  </p>
                  <p className="text-slate-400 text-xs">
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
  strategies: typeof STRATEGIES;
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

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Velg strategi</h2>

      {mode === "paper" && (
        <p className="text-blue-400 text-sm mb-4">
          💡 Paper mode — ingen ekte penger
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
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-600 transition gap-3"
                onClick={() =>
                  setExpandedStrategy(expanded ? null : strategy.type)
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{strategy.icon}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">
                        {strategy.name}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < strategy.risk
                                ? RISK_COLORS[strategy.risk]
                                : "text-slate-600"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm truncate">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  {active ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Aktiv
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Ikke startet</span>
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
                            onClick={() => onStop(strategy.type)}
                            className="flex-1 py-3 min-h-[44px] bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition flex items-center justify-center gap-2"
                          >
                            <Square className="w-4 h-4" />
                            Stopp strategi
                          </button>
                        ) : (
                          <button
                            onClick={() => onStart(strategy.type)}
                            disabled={isStarting === strategy.type}
                            className="flex-1 py-3 min-h-[44px] bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isStarting === strategy.type ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                Starter...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Start strategi
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
  switch (type) {
    case "dca_trygg": {
      const dcaConfig = config as {
        weeklyAmount: number;
        btcAllocation: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-slate-400 text-sm">
              Ukentlig beløp: {dcaConfig.weeklyAmount} NOK
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={dcaConfig.weeklyAmount}
              onChange={(e) =>
                onChange({ ...config, weeklyAmount: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              BTC-fordeling: {dcaConfig.btcAllocation}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={dcaConfig.btcAllocation}
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
            <label className="text-slate-400 text-sm">
              Risiko per trade: {trendConfig.riskPerTrade}%
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={trendConfig.riskPerTrade}
              onChange={(e) =>
                onChange({ ...config, riskPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Stop-loss: {trendConfig.stopLoss}%
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={trendConfig.stopLoss}
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
            <label className="text-slate-400 text-sm">Aggressivitet</label>
            <select
              value={multiConfig.aggressiveness}
              onChange={(e) =>
                onChange({ ...config, aggressiveness: e.target.value })
              }
              className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
            >
              <option value="forsiktig">Forsiktig</option>
              <option value="normal">Normal</option>
              <option value="aggressiv">Aggressiv</option>
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
              <label className="text-slate-400 text-sm">Øvre pris</label>
              <input
                type="number"
                value={gridConfig.upperPrice}
                onChange={(e) =>
                  onChange({ ...config, upperPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm">Nedre pris</label>
              <input
                type="number"
                value={gridConfig.lowerPrice}
                onChange={(e) =>
                  onChange({ ...config, lowerPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Grid-nivåer: {gridConfig.levels}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={gridConfig.levels}
              onChange={(e) =>
                onChange({ ...config, levels: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Kapital: {gridConfig.capital} NOK
            </label>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={gridConfig.capital}
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
            <label className="text-slate-400 text-sm">
              Maks per trade: {aiConfig.maxPerTrade} NOK
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={aiConfig.maxPerTrade}
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Maks tap: {aiConfig.maxLoss} NOK
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={aiConfig.maxLoss}
              onChange={(e) =>
                onChange({ ...config, maxLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
