"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";

export interface MobileTradingCardProps {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency?: string;
  /** Percentage change, e.g. 5.23 for +5.23% */
  changePercent: number;
  /** Optional sparkline data points for mini chart */
  sparklineData?: number[];
  /** Day range for range bar indicator (Robinhood pattern) */
  dayLow?: number;
  dayHigh?: number;
  onPress?: () => void;
  onBuy?: () => void;
  onSell?: () => void;
  className?: string;
}

/**
 * MobileTradingCard — Robinhood-inspired portfolio position card
 *
 * Compact, information-dense card for mobile portefølje-visning.
 * Shows symbol, position size, P&L, and a mini sparkline.
 *
 * @example
 * <MobileTradingCard
 *   symbol="AAPL"
 *   name="Apple Inc."
 *   quantity={10}
 *   avgPrice={150.00}
 *   currentPrice={175.50}
 *   changePercent={17.0}
 *   onPress={() => openDetail("AAPL")}
 * />
 */
export function MobileTradingCard({
  symbol,
  name,
  quantity,
  avgPrice,
  currentPrice,
  currency = "USD",
  changePercent,
  sparklineData,
  dayLow,
  dayHigh,
  onPress,
  onBuy,
  onSell,
  className,
}: MobileTradingCardProps) {
  const t = useTranslations("trading");
  const haptic = useHaptic();

  const totalValue = quantity * currentPrice;
  const totalCost = quantity * avgPrice;
  const pnl = totalValue - totalCost;
  const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
  const isProfit = pnl >= 0;

  const hasRange = dayLow !== undefined && dayHigh !== undefined && dayHigh > dayLow;
  const rangePosition = hasRange
    ? ((currentPrice - dayLow) / (dayHigh - dayLow)) * 100
    : 50;

  const handlePress = () => {
    haptic("light");
    onPress?.();
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("medium");
    onBuy?.();
  };

  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("medium");
    onSell?.();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handlePress}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4",
        "active:bg-white/[0.05] transition-colors",
        className
      )}
    >
      {/* Symbol avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-bold text-white">
        {symbol.slice(0, 2)}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold text-white">{symbol}</span>
          <span className="text-sm font-medium text-white">
            {formatCurrency(totalValue, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-xs text-white/50">{name}</span>
          <span
            className={cn(
              "text-xs font-medium",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isProfit ? "+" : ""}
            {pnlPercent.toFixed(2)}%
          </span>
        </div>

        {/* Day range indicator (Robinhood pattern) */}
        {hasRange && (
          <div className="mt-2">
            <div className="relative h-1 rounded-full bg-white/[0.08]">
              <div
                className="absolute top-0 h-full w-[2px] rounded-full"
                style={{
                  left: `${rangePosition}%`,
                  backgroundColor: isProfit ? "#34d399" : "#fb7185",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/30">
                L: {formatCurrency(dayLow, currency)}
              </span>
              <span className="text-[9px] text-white/30">
                H: {formatCurrency(dayHigh, currency)}
              </span>
            </div>
          </div>
        )}

        {/* Quantity + PnL bar */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-white/40">
            {quantity} {t("shares")} · {t("avg")} {formatCurrency(avgPrice, currency)}
          </span>

          {(onBuy || onSell) && (
            <div className="flex items-center gap-2">
              {onBuy && (
                <button
                  onClick={handleBuy}
                  className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400 active:bg-emerald-500/30"
                >
                  {t("buy")}
                </button>
              )}
              {onSell && (
                <button
                  onClick={handleSell}
                  className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-medium text-rose-400 active:bg-rose-500/30"
                >
                  {t("sell")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mini sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="hidden sm:block w-16 h-8">
          <Sparkline data={sparklineData} isPositive={isProfit} />
        </div>
      )}
    </motion.div>
  );
}

function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 64;
    const y = 32 - ((value - min) / range) * 32;
    return `${x},${y}`;
  });

  const color = isPositive ? "#34d399" : "#fb7185";

  return (
    <svg viewBox="0 0 64 32" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
