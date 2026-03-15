"use client";

import { ComponentErrorBoundary } from "@/components/ComponentErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaperTradingEngine } from "@/lib/hooks/usePaperTradingEngine";
import { generateSignal } from "@/lib/trading/signal-generator";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, Bot } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

// KLA-108: Dynamic Import for heavy chart components
const StrategyCharts = dynamic(() => import("./StrategyCharts"), {
  ssr: false,
  loading: () => (
    <div className="lg:col-span-2 h-[450px] bg-slate-900/50 rounded-xl animate-pulse flex items-center justify-center">
      <div className="text-slate-500 flex items-center gap-2">
        <Activity className="animate-spin h-5 w-5" />
        Laster interaktivt kart...
      </div>
    </div>
  ),
});

// ─── Types ───

interface Strategy {
  id: string;
  strategy_type: string;
  trading_mode: "paper" | "live";
  is_active: boolean;
  symbol: string;
  capital_allocation: number;
  pnl_usdt?: number;
  pnl_percent?: number;
  open_trades?: number;
  total_trades?: number;
  created_at: string;
}

interface LogEntry {
  id: string;
  action: "BUY" | "SELL" | "HOLD";
  price: number;
  reason: string;
  pnlPercent?: number;
  timestamp: Date;
}

interface ChartPoint {
  time: string;
  price: number;
  signal?: "BUY" | "SELL";
}

interface EquityPoint {
  time: string;
  equity: number;
}

const STRATEGY_LABELS: Record<string, string> = {
  dca_trygg: "DCA Trygg",
  trend_balansert: "Trend Balansert",
  multisignal_aktiv: "Multi-Signal Aktiv",
  grid_bot: "Grid Bot",
  ai_copy: "AI Copy",
};

const WARMUP_TICKS = 30;

// ─── Main Component ───

interface LiveStrategyViewProps {
  strategy: Strategy;
  onBack: () => void;
}

export function LiveStrategyView({ strategy, onBack }: LiveStrategyViewProps) {
  const engine = usePaperTradingEngine(strategy.symbol);

  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [simStats, setSimStats] = useState({
    pnl: 0,
    winRate: 0,
    totalTrades: 0,
    maxDrawdown: 0,
  });
  const [isWarmup, setIsWarmup] = useState(true);
  const [tickCount, setTickCount] = useState(0);

  const startingEquity = useRef(strategy.capital_allocation);
  const currentEquity = useRef(strategy.capital_allocation);
  const wins = useRef(0);
  const losses = useRef(0);
  const hasPosition = useRef(false);
  const entryPrice = useRef(0);
  const peakEquity = useRef(strategy.capital_allocation);
  const lastDcaTick = useRef(0);
  const prevPnl = useRef(0);

  // Process each price tick
  useEffect(() => {
    if (engine.price <= 0) return;

    setPriceHistory((prev) => {
      const updated = [...prev, engine.price].slice(-200);

      // Don't generate signals during warmup
      const tick = updated.length;
      setTickCount(tick);
      if (tick < WARMUP_TICKS) {
        setIsWarmup(true);
        return updated;
      }
      setIsWarmup(false);

      // Generate signal (KLA-107: Using extracted logic)
      let signal = generateSignal(strategy.strategy_type, updated);

      // DCA: only buy every 20 ticks
      if (strategy.strategy_type === "dca_trygg") {
        if (tick - lastDcaTick.current < 20) {
          signal = {
            action: "HOLD",
            reason: `Neste DCA-kjøp om ${20 - (tick - lastDcaTick.current)} ticks`,
          };
        }
      }

      // Don't buy if already in position, don't sell if not
      if (
        signal.action === "BUY" &&
        hasPosition.current &&
        strategy.strategy_type !== "dca_trygg"
      ) {
        signal = {
          action: "HOLD",
          reason: signal.reason + " (har allerede posisjon)",
        };
      }
      if (signal.action === "SELL" && !hasPosition.current) {
        signal = {
          action: "HOLD",
          reason: signal.reason + " (ingen posisjon å selge)",
        };
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString("no");

      // Update chart data
      setChartData((prev) =>
        [
          ...prev,
          {
            time: timeStr,
            price: engine.price,
            signal: signal.action !== "HOLD" ? signal.action : undefined,
          },
        ].slice(-100),
      );

      // Execute signal
      if (signal.action === "BUY") {
        hasPosition.current = true;
        entryPrice.current = engine.price;
        if (strategy.strategy_type === "dca_trygg") lastDcaTick.current = tick;

        setLogEntries((prev) =>
          [
            {
              id: `${Date.now()}-${Math.random()}`,
              action: "BUY" as const,
              price: engine.price,
              reason: signal.reason,
              timestamp: now,
            },
            ...prev,
          ].slice(0, 50),
        );
      } else if (signal.action === "SELL" && hasPosition.current) {
        const pnlPct =
          ((engine.price - entryPrice.current) / entryPrice.current) * 100;
        const pnlAmt = (pnlPct / 100) * startingEquity.current * 0.1; // 10% of capital per trade
        currentEquity.current += pnlAmt;
        if (pnlPct > 0) wins.current++;
        else losses.current++;
        hasPosition.current = false;

        if (currentEquity.current > peakEquity.current)
          peakEquity.current = currentEquity.current;
        const dd =
          ((peakEquity.current - currentEquity.current) / peakEquity.current) *
          100;

        const total = wins.current + losses.current;
        setSimStats({
          pnl: currentEquity.current - startingEquity.current,
          winRate: total > 0 ? (wins.current / total) * 100 : 0,
          totalTrades: total,
          maxDrawdown: dd,
        });

        setLogEntries((prev) =>
          [
            {
              id: `${Date.now()}-${Math.random()}`,
              action: "SELL" as const,
              price: engine.price,
              reason: signal.reason,
              pnlPercent: pnlPct,
              timestamp: now,
            },
            ...prev,
          ].slice(0, 50),
        );
      } else {
        // Log HOLD occasionally (every 10 ticks)
        if (tick % 10 === 0) {
          setLogEntries((prev) =>
            [
              {
                id: `${Date.now()}-${Math.random()}`,
                action: "HOLD" as const,
                price: engine.price,
                reason: signal.reason,
                timestamp: now,
              },
              ...prev,
            ].slice(0, 50),
          );
        }
      }

      // Update equity curve
      const unrealized = hasPosition.current
        ? ((engine.price - entryPrice.current) / entryPrice.current) *
          startingEquity.current *
          0.1
        : 0;
      setEquityData((prev) =>
        [
          ...prev,
          {
            time: timeStr,
            equity: currentEquity.current + unrealized,
          },
        ].slice(-100),
      );

      return updated;
    });
  }, [engine.price]);

  const pnlChanged = simStats.pnl !== prevPnl.current;
  useEffect(() => {
    prevPnl.current = simStats.pnl;
  }, [simStats.pnl]);

  const isPaper = strategy.trading_mode === "paper";
  const strategyName =
    STRATEGY_LABELS[strategy.strategy_type] || strategy.strategy_type;

  const buyDots = useMemo(
    () => chartData.filter((d) => d.signal === "BUY"),
    [chartData],
  );
  const sellDots = useMemo(
    () => chartData.filter((d) => d.signal === "SELL"),
    [chartData],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tilbake
        </Button>
        <Badge
          variant={isPaper ? "outline" : "default"}
          className={cn(
            isPaper
              ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
              : "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
          )}
        >
          {isPaper ? "📝 Paper" : "🟢 Live"}
        </Badge>
        <h2 className="text-xl font-bold">{strategyName}</h2>
        <span className="text-sm text-muted-foreground font-mono">
          {strategy.symbol}
        </span>
      </div>

      {/* Warmup overlay */}
      {isWarmup && (
        <Card className="border-2 border-dashed border-blue-400 dark:border-blue-600">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Analyserer markedet...
              </p>
              <p className="text-sm text-muted-foreground">
                Bygger indikator-buffere ({tickCount}/{WARMUP_TICKS} ticks)
              </p>
              <div className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(tickCount / WARMUP_TICKS) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isWarmup && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KLA-108: Refactored and Lazy Loaded Charts */}
            <ComponentErrorBoundary name="Interaktive Grafer">
              <StrategyCharts
                chartData={chartData}
                equityData={equityData}
                symbol={strategy.symbol}
                pnl={simStats.pnl}
                startingEquity={startingEquity.current}
                buyDots={buyDots}
                sellDots={sellDots}
              />
            </ComponentErrorBoundary>

            {/* Right: Stats */}
            <div className="space-y-4">
              <StatCard
                label="P&L"
                value={`${simStats.pnl >= 0 ? "+" : ""}${simStats.pnl.toFixed(
                  2,
                )} USDT`}
                positive={simStats.pnl >= 0}
                animate={pnlChanged}
              />
              <StatCard
                label="Win Rate"
                value={`${simStats.winRate.toFixed(1)}%`}
                positive={simStats.winRate >= 50}
              />
              <StatCard
                label="Trades"
                value={`${simStats.totalTrades}`}
                positive
              />
              <StatCard
                label="Max Drawdown"
                value={`-${simStats.maxDrawdown.toFixed(1)}%`}
                positive={simStats.maxDrawdown < 5}
              />
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-slate-500">Nåværende pris</p>
                  <p className="text-xl font-bold text-white font-mono">
                    {Math.round(engine.price).toLocaleString("no")} kr
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bot Log */}
          <Card className="bg-slate-900 text-white border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Bot-Logg
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {logEntries.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">
                      Venter på signaler...
                    </p>
                  ) : (
                    logEntries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "p-3 rounded-lg border text-sm",
                          entry.action === "BUY" &&
                            "bg-green-950/40 border-green-800",
                          entry.action === "SELL" &&
                            "bg-red-950/40 border-red-800",
                          entry.action === "HOLD" &&
                            "bg-slate-800/50 border-slate-700",
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span>
                              {entry.action === "BUY"
                                ? "🟢"
                                : entry.action === "SELL"
                                  ? "🔴"
                                  : "⏸"}
                            </span>
                            <span className="font-semibold">
                              {entry.action === "HOLD"
                                ? "HOLD"
                                : `${entry.action} ${strategy.symbol.replace(
                                    "USDT",
                                    "",
                                  )}`}
                              {entry.action !== "HOLD" &&
                                ` @ ${Math.round(entry.price).toLocaleString(
                                  "no",
                                )} kr`}
                            </span>
                            {entry.pnlPercent !== undefined && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  entry.pnlPercent >= 0
                                    ? "border-green-600 text-green-400"
                                    : "border-red-600 text-red-400",
                                )}
                              >
                                {entry.pnlPercent >= 0 ? "+" : ""}
                                {entry.pnlPercent.toFixed(2)}%
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {entry.timestamp.toLocaleTimeString("no")}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs italic">
                          &ldquo;{entry.reason}&rdquo;
                        </p>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ───

function StatCard({
  label,
  value,
  positive,
  animate,
}: {
  label: string;
  value: string;
  positive: boolean;
  animate?: boolean;
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-4 pb-3 text-center">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <motion.p
          className={cn(
            "text-2xl font-bold font-mono",
            positive ? "text-green-400" : "text-red-400",
          )}
          animate={animate ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {value}
        </motion.p>
      </CardContent>
    </Card>
  );
}
