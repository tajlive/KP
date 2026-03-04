"use client";

import { Trade } from "@/lib/trading-api";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

interface RecentTradesSectionProps {
  trades: Trade[];
  formatNOK: (v: number) => string;
}

export function RecentTradesSection({
  trades,
  formatNOK,
}: RecentTradesSectionProps) {
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const handleExplain = async (trade: Trade) => {
    if (explanations[trade.id] || explainingId === trade.id) return;

    setExplainingId(trade.id);
    try {
      const res = await fetch("/api/ai/explain-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, locale: "no" }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExplanations((prev) => ({ ...prev, [trade.id]: data.explanation }));
    } catch (_) {
      toast.error("Kunne ikke hente AI-forklaring");
    } finally {
      setExplainingId(null);
    }
  };

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
                className="bg-slate-700 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${trade.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {trade.side === "buy" ? "KJØP" : "SALG"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{trade.symbol}</p>
                      <p className="text-slate-400 text-xs">
                        {(trade.strategy_signal as {strategy_type?: string})?.strategy_type || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
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
                    <button
                      onClick={() => handleExplain(trade)}
                      disabled={explainingId === trade.id}
                      title="Spør AI-trener om denne traden"
                      className="p-2 bg-slate-800 hover:bg-slate-600 rounded transition text-xs flex items-center justify-center w-8 h-8 disabled:opacity-50 shrink-0"
                    >
                      {explainingId === trade.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm">🤖</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Explanation Accordion */}
                <AnimatePresence>
                  {explanations[trade.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-800 border-t border-slate-600 p-3 text-sm text-slate-300 flex gap-3 items-start"
                    >
                      <div className="text-xl mt-1">
                        {isProfit ? "🎉" : "🛡️"}
                      </div>
                      <div className="leading-relaxed">
                        <span className="font-semibold text-white">
                          AI Trener:{" "}
                        </span>
                        {explanations[trade.id]}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
