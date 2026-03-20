"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStrategyIconComponent } from "@/lib/trading/strategy-icons";

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

interface StrategyCardProps {
  strategy: Strategy;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onClick?: (strategy: Strategy) => void;
  /** Locale for "Åpne strategi" / "Open strategy" */
  locale?: string;
}

const STRATEGY_LABELS: Record<string, { name: string; description: string }> = {
  dca_trygg: {
    name: "DCA Trygg",
    description: "Ukentlig dollar-cost averaging",
  },
  trend_balansert: {
    name: "Trend Balansert",
    description: "MA-crossover med RSI-filter",
  },
  multisignal_aktiv: {
    name: "Multi-Signal",
    description: "RSI + momentum på 4h",
  },
  grid_bot: {
    name: "Grid Bot",
    description: "Automatisk grid trading",
  },
  ai_copy: {
    name: "AI Copy",
    description: "Kopier AI-genererte signaler",
  },
};

export function StrategyCard({
  strategy,
  onToggle,
  onDelete,
  onClick,
  locale = "no",
}: StrategyCardProps) {
  const strategyMeta = STRATEGY_LABELS[strategy.strategy_type] || {
    name: strategy.strategy_type,
    description: "Custom strategy",
  };
  const StrategyIcon = getStrategyIconComponent(strategy.strategy_type);

  const isProfit = (strategy.pnl_usdt ?? 0) >= 0;
  const isPaper = strategy.trading_mode === "paper";

  const handleOpen = () => onClick?.(strategy);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2",
        strategy.is_active
          ? "border-2 border-green-500 dark:border-green-600"
          : "border-gray-200 dark:border-gray-800",
      )}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      {/* Status indicator stripe */}
      {strategy.is_active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-green-400 via-emerald-500 to-green-600 animate-gradient-fast" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StrategyIcon
              className="h-8 w-8 shrink-0 text-[#0052FF]"
              aria-hidden
            />
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {strategyMeta.name}
                <Badge
                  variant={isPaper ? "outline" : "default"}
                  className={cn(
                    "text-xs",
                    isPaper
                      ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                      : "bg-linear-to-r from-green-600 to-emerald-600 text-white",
                  )}
                >
                  {isPaper ? "Paper" : "Live"}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {strategyMeta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={strategy.is_active ? "outline" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(strategy.id, strategy.is_active);
              }}
              className={cn(
                "rounded-full",
                strategy.is_active &&
                  "bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900",
              )}
            >
              {strategy.is_active ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(strategy.id);
              }}
              className="rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Symbol og capital */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="font-mono font-semibold">{strategy.symbol}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="font-mono">
              {strategy.capital_allocation} USDT
            </span>
          </div>
        </div>

        {/* PnL (hvis aktiv) */}
        {strategy.pnl_usdt !== undefined && (
          <div
            className={cn(
              "p-3 rounded-lg",
              isProfit
                ? "bg-green-50 dark:bg-green-950/30"
                : "bg-red-50 dark:bg-red-950/30",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  Total P&L
                </span>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "text-lg font-bold",
                    isProfit
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {isProfit ? "+" : ""}
                  {strategy.pnl_usdt?.toFixed(2)} USDT
                </div>
                {strategy.pnl_percent !== undefined && (
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isProfit
                        ? "text-green-500 dark:text-green-400"
                        : "text-red-500 dark:text-red-400",
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {strategy.pnl_percent.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trade stats */}
        {strategy.total_trades !== undefined && strategy.total_trades > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>
              {strategy.open_trades || 0} åpne trades - {strategy.total_trades}{" "}
              totalt
            </span>
          </div>
        )}

        {onClick && (
          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-[#0052FF] hover:underline">
              {locale === "en" ? "Open strategy →" : "Åpne strategi →"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
