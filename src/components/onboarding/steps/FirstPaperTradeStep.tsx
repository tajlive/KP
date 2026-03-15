"use client";

import { useOnboardingStore } from "@/store/onboarding-store";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Play,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

const DEMO_TRADES = [
  { symbol: "BTC/USDT", side: "buy" as const, price: 97_432, target: 99_150 },
  { symbol: "ETH/USDT", side: "buy" as const, price: 3_421, target: 3_510 },
  { symbol: "SOL/USDT", side: "sell" as const, price: 186, target: 179 },
];

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FirstPaperTradeStep() {
  const [phase, setPhase] = useState<"choose" | "executing" | "result">(
    "choose",
  );
  const [chosenTrade, setChosenTrade] = useState<
    (typeof DEMO_TRADES)[0] | null
  >(null);
  const [pnl, setPnl] = useState(0);
  const { setPaperTradeResult, markStepComplete } = useOnboardingStore();

  const executeTrade = (trade: (typeof DEMO_TRADES)[0]) => {
    setChosenTrade(trade);
    setPhase("executing");

    // Simulate trade execution
    setTimeout(() => {
      const simulatedPnl =
        trade.side === "buy"
          ? ((trade.target - trade.price) / trade.price) * 1000
          : ((trade.price - trade.target) / trade.price) * 1000;
      setPnl(Math.round(simulatedPnl * 100) / 100);

      setPaperTradeResult({
        symbol: trade.symbol,
        side: trade.side,
        entryPrice: trade.price,
        exitPrice: trade.target,
        pnl: simulatedPnl,
        timestamp: new Date().toISOString(),
      });
      markStepComplete("first_paper_trade");
      setPhase("result");
    }, 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
      <AnimatePresence mode="wait">
        {phase === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600
                           flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
              >
                <Play className="w-8 h-8 text-white ml-1" />
              </motion.div>
              <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-2">
                Din første trade
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">
                Prøv en simulert trade — helt risikofritt med lekepenger
              </p>
            </div>

            {/* Trade options */}
            <div className="space-y-3">
              {DEMO_TRADES.map((trade) => (
                <motion.button
                  key={trade.symbol}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => executeTrade(trade)}
                  className="w-full flex items-center gap-4 p-4
                             bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                             rounded-2xl border-2 border-gray-200/60 dark:border-gray-800/60
                             hover:border-indigo-500/40
                             transition-all duration-200 shadow-sm"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                                  ${
                                    trade.side === "buy"
                                      ? "bg-emerald-500/10"
                                      : "bg-rose-500/10"
                                  }`}
                  >
                    {trade.side === "buy" ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                      {trade.side === "buy" ? "Kjøp" : "Selg"} {trade.symbol}
                    </p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">
                      {formatUSD(trade.price)} → {formatUSD(trade.target)}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-300" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "executing" && (
          <motion.div
            key="exec"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center"
          >
            {/* Animated spinner */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-blue-500"
              />
              <div
                className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10
                             flex items-center justify-center"
              >
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">
              Utfører trade...
            </h3>
            <p className="text-[15px] text-gray-500 dark:text-gray-400">
              {chosenTrade?.side === "buy" ? "Kjøper" : "Selger"}{" "}
              {chosenTrade?.symbol}
            </p>

            {/* Animated dots */}
            <div className="flex gap-1.5 justify-center mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-blue-500"
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center w-full max-w-sm"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10
                         flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </motion.div>

            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-2">
              Trade fullført! 🎉
            </h2>

            {/* P&L card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-5 rounded-3xl
                         bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                         border border-gray-200/50 dark:border-gray-800/50
                         shadow-lg"
            >
              <p className="text-[13px] text-gray-500 mb-1">Simulert P&L</p>
              <p
                className={`text-[32px] font-bold tabular-nums ${pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
              >
                {pnl >= 0 ? "+" : ""}
                {pnl.toFixed(2)} USDT
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-[13px] text-gray-500">
                <span>{chosenTrade?.symbol}</span>
                <span>•</span>
                <span>{chosenTrade?.side === "buy" ? "Kjøp" : "Selg"}</span>
                <span>•</span>
                <span>Simulering</span>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-[13px] text-gray-400 dark:text-gray-500 mt-6"
            >
              Trykk «Neste» for å fullføre oppsettet →
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
