"use client";

import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import type { Trade } from "@/lib/trading-api";

export function RecentTradesSection({
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
