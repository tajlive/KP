"use client";

import { useTranslations } from "next-intl";
import type { Trade } from "@/lib/trading-api";

interface TradeReasonChipProps {
  trade: Trade;
  onClick?: () => void;
}

export function TradeReasonChip({ trade, onClick }: TradeReasonChipProps) {
  const t = useTranslations("trading.chips");
  const signal = trade.strategy_signal;

  if (!signal) {
    return (
      <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
        {t("automatic")}
      </span>
    );
  }

  // Extract reason info from strategy_signal
  const reason = signal.reason as string | undefined;
  const confidence = signal.confidence as number | undefined;
  const strategyType = signal.strategy_type as string | undefined;

  // Determine confidence level for color
  const confLevel =
    confidence && confidence >= 80 ? 3 : confidence && confidence >= 50 ? 2 : 1;

  const colorClass =
    confLevel === 3
      ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/40"
      : confLevel === 2
        ? "bg-amber-900/30 text-amber-400 border-amber-800/40"
        : "bg-slate-700/50 text-slate-400 border-slate-600/40";

  const label = reason || strategyType || t("signal");

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
      title={confidence ? `${t("confidence")}: ${confidence}%` : undefined}
    >
      <span className="truncate max-w-[120px]">{label}</span>
      {confidence && (
        <span className="opacity-60 text-[10px]">{confidence}%</span>
      )}
    </button>
  );
}
