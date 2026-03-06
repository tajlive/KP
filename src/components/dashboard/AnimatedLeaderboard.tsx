"use client";

import { Sparkline } from "@/components/charts/Sparkline";
import { LeaderboardTrader } from "@/types/trading";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronRight, Copy, Shield, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { CopyTradingCard } from "./CopyTradingCard";

// A mock algorithm to cycle the list and change PnL to simulate live movement
const initialData: LeaderboardTrader[] = [
  {
    id: "t1",
    rank: 1,
    name: "QuantMaster",
    pnl_percent: 142.5,
    trades_count: 342,
    win_rate: 68,
    risk_score: "Lav",
    sharpe_ratio: 2.4,
    sparkline_data: [100, 105, 103, 112, 110, 125, 142],
  },
  {
    id: "t2",
    rank: 2,
    name: "AlphaSeeker",
    pnl_percent: 118.2,
    trades_count: 156,
    win_rate: 54,
    risk_score: "Høy",
    sharpe_ratio: 0.8,
    sparkline_data: [100, 90, 85, 140, 95, 105, 118],
  },
  {
    id: "t3",
    rank: 3,
    name: "SteadyGrowth",
    pnl_percent: 89.4,
    trades_count: 89,
    win_rate: 82,
    risk_score: "Lav",
    sharpe_ratio: 3.1,
    sparkline_data: [100, 102, 105, 106, 107, 108, 109],
  },
  {
    id: "t4",
    rank: 4,
    name: "DegenApe",
    pnl_percent: -45.6,
    trades_count: 945,
    win_rate: 31,
    risk_score: "Høy",
    sharpe_ratio: -1.2,
    sparkline_data: [100, 150, 50, 200, 10, -30, -45],
  },
  {
    id: "t5",
    rank: 5,
    name: "GridBot_v2",
    pnl_percent: 34.1,
    trades_count: 1205,
    win_rate: 61,
    risk_score: "Medium",
    sharpe_ratio: 1.5,
    sparkline_data: [100, 98, 101, 105, 102, 103, 104],
  },
];

export function AnimatedLeaderboard() {
  const [traders, setTraders] = useState<LeaderboardTrader[]>(initialData);
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);

  // Simulate a live websocket that updates PnL and re-sorts array every 5 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setTraders((current) => {
        const updated = current.map((t) => {
          // Add some random noise to PnL
          const noise = (Math.random() - 0.5) * 5;
          const newPnl = Number((t.pnl_percent + noise).toFixed(1));

          // Add new data point to sparkline
          const newSparkline = [...t.sparkline_data.slice(1), 100 + newPnl];

          return {
            ...t,
            pnl_percent: newPnl,
            sparkline_data: newSparkline,
          };
        });

        // Re-sort array
        const sorted = updated.sort((a, b) => b.pnl_percent - a.pnl_percent);

        // Update ranks
        return sorted.map((t, index) => ({ ...t, rank: index + 1 }));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (score: string) => {
    switch (score) {
      case "Lav":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "Høy":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getSparklineColor = (pnl: number, risk: string) => {
    if (pnl < 0) return "red";
    if (risk === "Høy") return "yellow";
    return "green";
  };

  if (selectedTrader) {
    const traderInfo = traders.find((t) => t.id === selectedTrader);
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div>
            <button
              onClick={() => setSelectedTrader(null)}
              className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center mb-2"
            >
              ← Tilbake til Top 5
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Kopierer {traderInfo?.name}
            </h2>
          </div>
        </div>
        <CopyTradingCard />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/80 p-5 px-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
            <Trophy className="h-5 w-5 text-amber-400" />
            Topp Tradere (Live)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Risiko-justert for å beskytte fremtidig profitt
          </p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Activity className="w-3 h-3 animate-pulse" /> Live
          </span>
        </div>
      </div>

      <div className="hidden grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/40 md:grid border-b border-slate-800">
        <div className="col-span-1">Rank</div>
        <div className="col-span-3">Trader</div>
        <div className="col-span-2">Risiko Score</div>
        <div className="col-span-2 text-right">Total PnL</div>
        <div className="col-span-2 text-center">Trend (7d)</div>
        <div className="col-span-2"></div>
      </div>

      <div className="flex-1 overflow-x-hidden flex flex-col p-2 gap-2 relative">
        <AnimatePresence initial={false}>
          {traders.map((trader) => (
            <motion.div
              key={trader.id}
              layout="position"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
              }}
              className="group relative flex flex-col md:grid md:grid-cols-12 items-center gap-4 rounded-xl border border-transparent bg-slate-900/60 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/80"
            >
              {/* RANK */}
              <div className="flex w-full md:w-auto md:col-span-1 items-center justify-between md:justify-start">
                <span className="text-slate-500 md:hidden text-xs font-bold uppercase">
                  Rank
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-inner
                  ${
                    trader.rank === 1
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : trader.rank === 2
                        ? "bg-slate-300/10 text-slate-300 border border-slate-400/20"
                        : trader.rank === 3
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {trader.rank}
                </span>
              </div>

              {/* NAME */}
              <div className="md:col-span-3 w-full border-t border-slate-800 md:border-0 pt-3 md:pt-0">
                <div className="font-semibold text-white truncate">
                  {trader.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {trader.trades_count} handler • {trader.win_rate}% Win
                </div>
              </div>

              {/* RISK SCORE */}
              <div className="md:col-span-2 w-full flex items-center justify-between md:justify-start">
                <span className="text-slate-500 md:hidden text-xs font-bold uppercase">
                  Risiko
                </span>
                <div className="flex flex-col md:block">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${getRiskColor(trader.risk_score)}`}
                  >
                    <Shield className="w-3 h-3" />
                    {trader.risk_score}
                  </span>
                  {trader.risk_score === "Lav" && (
                    <p className="text-[10px] text-emerald-500 mt-1 hidden md:block">
                      Sharpe: {trader.sharpe_ratio}
                    </p>
                  )}
                </div>
              </div>

              {/* PnL */}
              <div className="md:col-span-2 w-full flex items-center justify-between md:justify-end">
                <span className="text-slate-500 md:hidden text-xs font-bold uppercase">
                  Total PnL
                </span>
                <div
                  className={`text-lg font-bold tracking-tight bg-clip-text text-transparent ${trader.pnl_percent >= 0 ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gradient-to-br from-red-400 to-rose-500"}`}
                >
                  {trader.pnl_percent > 0 ? "+" : ""}
                  {trader.pnl_percent.toFixed(1)}%
                </div>
              </div>

              {/* SPARKLINE */}
              <div className="md:col-span-2 w-full flex items-center justify-between md:justify-center h-12">
                <span className="text-slate-500 md:hidden text-xs font-bold uppercase">
                  Trend
                </span>
                <div className="w-[80px] h-[36px]">
                  <Sparkline
                    data={trader.sparkline_data}
                    color={getSparklineColor(
                      trader.pnl_percent,
                      trader.risk_score,
                    )}
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="md:col-span-2 w-full flex justify-end">
                <Button
                  onClick={() => setSelectedTrader(trader.id)}
                  size="sm"
                  variant="outline"
                  className="w-full md:w-auto bg-slate-900 border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50 transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Kopier
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
        <Button
          variant="ghost"
          className="w-full text-slate-400 hover:text-white"
          size="sm"
        >
          Se fulle rankeringer <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
