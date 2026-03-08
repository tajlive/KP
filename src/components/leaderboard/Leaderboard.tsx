"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Copy, Shield, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StrategyType = "DCA" | "Trend" | "Grid";

interface LeaderboardEntry {
  id: string;
  isUser?: boolean;
  name: string;
  totalReturn: number;
  riskAdjustedScore: number;
  drawdown: number;
  riskLevel: number; // 1 (High) to 3 (Low)
  strategy: StrategyType;
  history: { day: number; value: number }[];
}

type SortMode = "riskAdjusted" | "return" | "lowRisk";

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Generator
// ─────────────────────────────────────────────────────────────────────────────

const generateHistory = (points = 10) => {
  let val = 0;
  return Array.from({ length: points }, (_, i) => {
    val += (Math.random() - 0.45) * 10;
    return { day: i, value: val };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const RiskStars = ({ level }: { level: number }) => {
  if (level === 1) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-emerald-400 fill-emerald-400" />
      ))}
    </div>
  );
};

const Sparkline = ({ data }: { data: { value: number }[] }) => {
  return (
    <div className="h-10 w-24 min-h-[40px] min-w-[96px]">
      <ResponsiveContainer width={96} height={40}>
        <LineChart data={data}>
          <YAxis hide domain={["auto", "auto"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [sortMode, setSortMode] = useState<SortMode>("riskAdjusted");
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Generate data only on client mount to avoid hydration mismatch
    const generatedData: LeaderboardEntry[] = [
      {
        id: "1",
        name: "Trader_Alpha",
        totalReturn: 45.2,
        riskAdjustedScore: 9.2,
        drawdown: 5.4,
        riskLevel: 3,
        strategy: "Trend",
        history: generateHistory(),
      },
      {
        id: "2",
        name: "Safe_Bet",
        totalReturn: 12.5,
        riskAdjustedScore: 8.8,
        drawdown: 2.1,
        riskLevel: 3,
        strategy: "DCA",
        history: generateHistory(),
      },
      {
        id: "3",
        name: "Moon_Seeker",
        totalReturn: 124.5,
        riskAdjustedScore: 7.5,
        drawdown: 42.1,
        riskLevel: 1,
        strategy: "Grid",
        history: generateHistory(),
      },
      {
        id: "4",
        name: "Stable_Hand",
        totalReturn: 18.2,
        riskAdjustedScore: 8.4,
        drawdown: 4.2,
        riskLevel: 3,
        strategy: "DCA",
        history: generateHistory(),
      },
      {
        id: "5",
        name: "Trend_Follower",
        totalReturn: 35.8,
        riskAdjustedScore: 8.1,
        drawdown: 12.5,
        riskLevel: 2,
        strategy: "Trend",
        history: generateHistory(),
      },
      {
        id: "user_me",
        name: "Trader_47",
        isUser: true,
        totalReturn: 28.4,
        riskAdjustedScore: 8.6,
        drawdown: 6.8,
        riskLevel: 2,
        strategy: "Trend",
        history: generateHistory(),
      },
      {
        id: "6",
        name: "Bot_Overlord",
        totalReturn: 15.1,
        riskAdjustedScore: 8.2,
        drawdown: 3.1,
        riskLevel: 3,
        strategy: "Grid",
        history: generateHistory(),
      },
      {
        id: "7",
        name: "Risk_Taker",
        totalReturn: 88.4,
        riskAdjustedScore: 6.8,
        drawdown: 35.2,
        riskLevel: 1,
        strategy: "Trend",
        history: generateHistory(),
      },
      {
        id: "8",
        name: "DCA_Master",
        totalReturn: 8.2,
        riskAdjustedScore: 7.9,
        drawdown: 1.5,
        riskLevel: 3,
        strategy: "DCA",
        history: generateHistory(),
      },
      {
        id: "9",
        name: "Grid_Runner",
        totalReturn: 22.5,
        riskAdjustedScore: 7.4,
        drawdown: 8.9,
        riskLevel: 2,
        strategy: "Grid",
        history: generateHistory(),
      },
      {
        id: "10",
        name: "Swing_King",
        totalReturn: 62.1,
        riskAdjustedScore: 7.2,
        drawdown: 22.4,
        riskLevel: 1,
        strategy: "Trend",
        history: generateHistory(),
      },
    ];
    setData(generatedData);
  }, []);

  const sortedData = useMemo(() => {
    if (data.length === 0) return [];
    const sorted = [...data];
    if (sortMode === "riskAdjusted") {
      sorted.sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
    } else if (sortMode === "return") {
      sorted.sort((a, b) => b.totalReturn - a.totalReturn);
    } else if (sortMode === "lowRisk") {
      sorted.sort(
        (a, b) => b.riskLevel - a.riskLevel || a.drawdown - b.drawdown,
      );
    }
    return sorted;
  }, [sortMode, data]);

  // Track rank changes for animations
  useEffect(() => {
    if (sortedData.length === 0) return;
    const currentRanks: Record<string, number> = {};
    sortedData.forEach((item, index) => {
      currentRanks[item.id] = index;
    });
    setPrevRanks(currentRanks);
  }, [sortedData]);

  const top20 = sortedData.slice(0, 10); // Display limit for UI
  const userRank = sortedData.findIndex((item) => item.isUser) + 1;
  const userInTopLevel = userRank <= 10;
  const userData = sortedData.find((item) => item.isUser);

  const spring = {
    type: "spring",
    stiffness: 400,
    damping: 35,
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-4xl mx-auto h-[600px] flex items-center justify-center bg-slate-900/40 rounded-3xl animate-pulse">
        <span className="text-slate-500 font-bold tracking-widest uppercase text-xs">
          Laster rangering...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Topp-tradere
          </h2>
          <p className="text-slate-400 text-sm">
            Basert på risikojustert avkastning
          </p>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
          {[
            { id: "riskAdjusted", label: "Risikojustert" },
            { id: "return", label: "Avkastning" },
            { id: "lowRisk", label: "Lavest risiko" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSortMode(mode.id as SortMode)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                sortMode === mode.id
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table Headers */}
      <div className="hidden sm:flex items-center px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/30">
        <div className="w-12">#</div>
        <div className="flex-1">Trader</div>
        <div className="w-24 text-center">Avkastning</div>
        <div className="w-24 text-center">Risiko</div>
        <div className="w-24 text-center">Nedgang</div>
        <div className="w-28 text-right">Trend</div>
      </div>

      {/* List */}
      <div className="p-4 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {top20.map((item, index) => (
            <LeaderboardRow
              key={item.id}
              item={item}
              rank={index + 1}
              spring={spring}
              prevRank={prevRanks[item.id]}
            />
          ))}
        </AnimatePresence>

        {!userInTopLevel && userData && (
          <>
            <div className="py-2 text-center text-slate-600 font-bold tracking-widest">
              ...
            </div>
            <LeaderboardRow
              item={userData}
              rank={userRank}
              spring={spring}
              highlight
            />
            <p className="text-center text-slate-500 text-xs font-medium">
              ... Du er på plass #{userRank}
            </p>
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700/50 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Oppdateres i sanntid • Kun papirhandel inkludert
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row Component
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardRow({
  item,
  rank,
  spring,
  highlight,
  prevRank,
}: {
  item: LeaderboardEntry;
  rank: number;
  spring: unknown;
  highlight?: boolean;
  prevRank?: number;
}) {
  const isUp = typeof prevRank === "number" && rank < prevRank + 1;
  const isDown = typeof prevRank === "number" && rank > prevRank + 1;

  return (
    <motion.div
      layoutId={item.id}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={spring as any}
      className={`relative group p-4 rounded-2xl border transition-all duration-300 ${
        item.isUser || highlight
          ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-slate-800/60"
          : "border-slate-700/50 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-700/40"
      } ${
        isUp
          ? "border-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          : isDown
            ? "border-red-400 ring-1 ring-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            : ""
      }`}
    >
      {/* Rank change indicator label */}
      <AnimatePresence mode="wait">
        {isUp && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase z-20 shadow-lg"
          >
            Klatrer!
          </motion.div>
        )}
        {isDown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase z-20 shadow-lg"
          >
            Faller
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Rank & Medal */}
        <div className="w-10 h-10 flex items-center justify-center font-black text-slate-500 shrink-0">
          {rank === 1 ? (
            <span className="text-2xl">🥇</span>
          ) : rank === 2 ? (
            <span className="text-2xl">🥈</span>
          ) : rank === 3 ? (
            <span className="text-2xl">🥉</span>
          ) : (
            `#${rank}`
          )}
        </div>

        {/* Name & Strategy */}
        <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-white font-bold truncate">
              {item.name}
              {item.isUser && (
                <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase">
                  Du
                </span>
              )}
            </span>
            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {item.strategy}
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-1 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> {item.riskAdjustedScore}/10 score
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:flex items-center gap-6 w-full sm:w-auto border-t sm:border-0 border-slate-700/50 pt-4 sm:pt-0">
          <div className="text-center sm:w-24">
            <p className="sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-1">
              Avkastning
            </p>
            <span
              className={`text-sm font-black ${item.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {item.totalReturn > 0 ? "+" : ""}
              {item.totalReturn}%
            </span>
          </div>

          <div className="text-center sm:w-24">
            <p className="sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-1">
              Risiko
            </p>
            <div className="flex justify-center">
              <RiskStars level={item.riskLevel} />
            </div>
          </div>

          <div className="text-center sm:w-24">
            <p className="sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-1">
              Nedgang
            </p>
            <span className="text-sm font-bold text-slate-400">
              -{item.drawdown}%
            </span>
          </div>

          <div className="hidden sm:block sm:w-28 text-right">
            <Sparkline data={item.history} />
          </div>
        </div>

        {/* Action */}
        <div className="w-full sm:w-auto flex items-center justify-center">
          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95">
            <Copy className="w-3 h-3" />
            Kopier
          </button>
        </div>
      </div>
    </motion.div>
  );
}
