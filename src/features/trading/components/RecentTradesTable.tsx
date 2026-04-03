"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import type { Trade, TradingMode } from "@/lib/trading-api";

interface RecentTradesTableProps {
  trades: Trade[];
  onSelectTrade?: (tradeId: string) => void;
  selectedTradeId?: string | null;
  modeFilter?: TradingMode | "all";
  onModeFilterChange?: (mode: TradingMode | "all") => void;
}

export function RecentTradesTable({
  trades,
  onSelectTrade,
  selectedTradeId,
  modeFilter = "all",
  onModeFilterChange,
}: RecentTradesTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const t = useTranslations("trading.recentTrades");
  const locale = useLocale();
  const isNorwegian = locale === "no";
  const dateLocale = isNorwegian ? nb : enUS;

  // Filter trades by mode
  const filteredTrades =
    modeFilter === "all" ? trades : trades.filter((t) => t.mode === modeFilter);

  // Format PnL with color
  const formatPnL = (pnl: number | null) => {
    if (pnl === null || pnl === undefined) return "—";
    const isProfit = pnl >= 0;
    const sign = isProfit ? "+" : "";
    return (
      <span className={isProfit ? "text-kp-success" : "text-kp-danger"}>
        {sign}
        {pnl.toLocaleString(isNorwegian ? "nb-NO" : "en-US", { maximumFractionDigits: 0 })} kr
      </span>
    );
  };

  // Format time with locale
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d. MMM HH:mm", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  // Get strategy name from strategy_signal
  const getStrategyName = (trade: Trade): string => {
    const signal = trade.strategy_signal;
    if (!signal) return "—";
    return (signal.strategy_type as string) || (signal.name as string) || "—";
  };

  // Get empty state message based on filter
  const getEmptyMessage = () => {
    if (modeFilter === "all") return t("emptyAll");
    if (modeFilter === "paper") return t("emptyPaper");
    return t("emptyLive");
  };

  if (filteredTrades.length === 0) {
    return (
      <div className="bg-kp-bg-tertiary/50 rounded-xl p-8 text-center border border-kp-border">
        <Clock className="w-12 h-12 text-kp-text-muted mx-auto mb-3" />
        <p className="text-kp-text-secondary font-medium">{t("empty")}</p>
        <p className="text-kp-text-muted text-sm mt-1">{getEmptyMessage()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter header */}
      {onModeFilterChange && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-kp-text-muted" />
          <span className="text-sm text-kp-text-muted">{t("filter")}:</span>
          <div className="flex gap-1">
            {(["all", "paper", "live"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeFilterChange(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  modeFilter === m
                    ? "bg-kp-brand text-white"
                    : "bg-kp-bg-tertiary text-kp-text-secondary hover:bg-kp-bg-hover"
                }`}
              >
                {m === "all" ? t("filterAll") : m === "paper" ? t("filterPaper") : t("filterLive")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table - Responsive with horizontal scroll on mobile */}
      <div className="bg-kp-bg-tertiary/50 rounded-xl border border-kp-border overflow-hidden">
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-kp-bg-tertiary text-xs font-medium text-kp-text-muted uppercase tracking-wider min-w-[600px]">
            <div className="col-span-2">{t("time")}</div>
            <div className="col-span-2">{t("symbol")}</div>
            <div className="col-span-2">{t("tradeType")}</div>
            <div className="col-span-2">{t("strategy")}</div>
            <div className="col-span-2 text-right">{t("size")}</div>
            <div className="col-span-2 text-right">{t("pnl")}</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-kp-border min-w-[600px]">
            <AnimatePresence>
              {filteredTrades.map((trade) => {
                const isSelected = selectedTradeId === trade.id;
                const isHovered = hoveredRow === trade.id;
                const isBuy = trade.side === "buy";
                const hasPnL = trade.realized_pnl !== null && trade.realized_pnl !== undefined;

                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 100 }}
                    onClick={() => onSelectTrade?.(trade.id)}
                    onMouseEnter={() => setHoveredRow(trade.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`
                      grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer transition-all
                      ${isSelected ? "bg-kp-brand-subtle border-l-4 border-kp-brand" : ""}
                      ${isHovered && !isSelected ? "bg-kp-bg-hover" : ""}
                    `}
                  >
                    {/* Time */}
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-kp-text-secondary text-sm">
                        {formatTime(trade.created_at)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          trade.mode === "live"
                            ? "bg-kp-success-bg text-kp-success"
                            : "bg-kp-brand-subtle text-kp-brand"
                        }`}
                      >
                        {trade.mode === "live" ? t("filterLive") : t("paperShort")}
                      </span>
                    </div>

                    {/* Symbol */}
                    <div className="col-span-2">
                      <span className="text-kp-text-primary font-semibold">{trade.symbol}</span>
                    </div>

                    {/* Type (Buy/Sell) */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        {isBuy ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-kp-success" />
                            <span className="text-kp-success font-medium">{t("buy")}</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-kp-danger" />
                            <span className="text-kp-danger font-medium">{t("sell")}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Strategy */}
                    <div className="col-span-2">
                      <span className="text-kp-text-muted text-sm truncate block">
                        {getStrategyName(trade)}
                      </span>
                    </div>

                    {/* Size */}
                    <div className="col-span-2 text-right">
                      <span className="text-kp-text-secondary text-sm tabular-nums">
                        {trade.quantity.toLocaleString(isNorwegian ? "nb-NO" : "en-US", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        @ {trade.price.toLocaleString(isNorwegian ? "nb-NO" : "en-US", { maximumFractionDigits: 0 })} kr
                      </span>
                    </div>

                    {/* PnL */}
                    <div className="col-span-2 text-right">
                      {hasPnL ? (
                        formatPnL(trade.realized_pnl)
                      ) : (
                        <span className="text-kp-text-muted">—</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer with count */}
      <p className="text-kp-text-muted text-sm text-center">
        {t("showingCount", { count: filteredTrades.length })}
        {modeFilter !== "all" && ` (${modeFilter === "paper" ? t("modePaper") : t("modeLive")})`}
      </p>
    </div>
  );
}
