"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { cn } from "@/lib/utils";

export function signalActionIsBuy(action: string | null) {
  const a = action?.toUpperCase() ?? "";
  return a === "BUY" || a === "LONG";
}

export function ConfidenceMeter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("w-full max-w-[104px]", className)}>
      <div className="h-1 rounded-full bg-slate-700/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type PremiumSignalLabels = {
  buy: string;
  sell: string;
};

export function PremiumSignalRow({
  symbol,
  action,
  confidence,
  entry_price: entryPrice,
  created_at: createdAt,
  staggerIndex = 0,
  highlight = false,
  isDemo = false,
  showEntryPrice = true,
  ageLabel,
  labels,
}: {
  id?: string;
  symbol: string;
  action: string | null;
  confidence: number | null;
  entry_price?: number | null;
  created_at: string | null;
  staggerIndex?: number;
  highlight?: boolean;
  isDemo?: boolean;
  showEntryPrice?: boolean;
  ageLabel: string;
  labels: PremiumSignalLabels;
}) {
  const buy = signalActionIsBuy(action);
  const priceLabel =
    showEntryPrice && entryPrice != null
      ? `$${entryPrice.toLocaleString("en-US")}`
      : showEntryPrice
        ? "—"
        : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: staggerIndex * 0.05, duration: 0.22 }}
      className={cn(
        MARKET_DESK.row,
        highlight && MARKET_DESK.rowHighlight,
        isDemo && MARKET_DESK.rowDemo,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between gap-x-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg tabular-nums",
              buy
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
                : "bg-red-500/15 text-red-400 ring-1 ring-red-500/25",
            )}
          >
            {buy ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {buy ? labels.buy : labels.sell}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate tabular-nums">
              {symbol}
            </p>
            {confidence != null && (
              <ConfidenceMeter
                value={confidence}
                className="mt-1 hidden sm:block"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
          {priceLabel != null && (
            <span className="text-xs text-slate-400 tabular-nums">
              {priceLabel}
            </span>
          )}
          {confidence != null && (
            <span className="text-xs font-bold text-emerald-400/95 tabular-nums">
              {Math.round(confidence)}%
            </span>
          )}
          <span className="text-[10px] text-slate-500 tabular-nums min-w-[4.5rem] text-right">
            {createdAt ? ageLabel : "—"}
          </span>
        </div>
      </div>
      {confidence != null && (
        <ConfidenceMeter value={confidence} className="mt-2 md:hidden" />
      )}
    </motion.div>
  );
}
