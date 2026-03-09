"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ChevronDown,
  Copy,
  Medal,
  Shield,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SortMode = "risk_adjusted" | "returns" | "low_risk";

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatarUrl?: string;
  pnl: number;
  pnlPercent: number;
  trades: number;
  winRate: number;
  sharpeRatio: number; // Risk-adjusted score
  maxDrawdown: number; // Negative percentage
  volatility: number; // Risk metric (0-100)
  strategy: string;
  sparklineData: number[]; // Last 7 data points for chart
  isOwnSession?: boolean; // match API property name
}

// Hook for copy trading functionality
import { useCopyTrader } from "@/lib/hooks/useCopyTrader";
import { useCopyTrading } from "@/lib/hooks/useCopyTrading";
// Toast for notifications (assuming shadcn ui)
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function SparklineChart({
  data,
  isPositive,
}: {
  data: number[];
  isPositive: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 50;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      width="50"
      height="24"
      viewBox="0 0 50 24"
      className="overflow-visible"
    >
      <defs>
        <linearGradient
          id={`gradient-${isPositive}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={isPositive ? "#10B981" : "#EF4444"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "#10B981" : "#EF4444"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <motion.path
        d={`${pathD} L 50,24 L 0,24 Z`}
        fill={`url(#gradient-${isPositive})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={isPositive ? "#10B981" : "#EF4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

function RiskStars({ volatility }: { volatility: number }) {
  // 5 stars max, filled based on volatility (0-100)
  const filledStars = Math.ceil((volatility / 100) * 5);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3 w-3",
            star <= filledStars
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-700 text-slate-700",
          )}
        />
      ))}
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30"
      >
        <Trophy className="h-4 w-4 text-white" />
      </motion.div>
    );
  }
  if (rank === 2) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 shadow-lg"
      >
        <Medal className="h-4 w-4 text-white" />
      </motion.div>
    );
  }
  if (rank === 3) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.2 }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 shadow-lg"
      >
        <Medal className="h-4 w-4 text-white" />
      </motion.div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800">
      <span className="text-sm font-bold text-slate-400">{rank}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data for Fallback
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DATA: LeaderboardEntry[] = [
  {
    id: "1",
    rank: 1,
    name: "Tom J.",
    pnl: 125000,
    pnlPercent: 125.4,
    trades: 147,
    winRate: 72,
    sharpeRatio: 3.2,
    maxDrawdown: -12,
    volatility: 24,
    strategy: "Thaj Trend",
    sparklineData: [50, 60, 55, 70, 85, 80, 95],
  },
  {
    id: "2",
    rank: 2,
    name: "Morten K.",
    pnl: 84000,
    pnlPercent: 84.1,
    trades: 92,
    winRate: 68,
    sharpeRatio: 2.8,
    maxDrawdown: -15,
    volatility: 35,
    strategy: "Scalper Pro",
    sparklineData: [40, 45, 42, 50, 48, 55, 60],
  },
  {
    id: "3",
    rank: 3,
    name: "Simen R.",
    pnl: 62000,
    pnlPercent: 62.8,
    trades: 215,
    winRate: 64,
    sharpeRatio: 2.4,
    maxDrawdown: -18,
    volatility: 42,
    strategy: "Klarpakke V1",
    sparklineData: [30, 35, 32, 40, 38, 45, 52],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const [sortMode, setSortMode] = useState<SortMode>("risk_adjusted");
  const [timeframe, setTimeframe] = useState<
    "daily" | "weekly" | "monthly" | "all"
  >("monthly");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { executeCopy, isCopying } = useCopyTrader();
  const { canCopyTrade, reason } = useCopyTrading();

  useEffect(() => {
    let tf = "week";
    if (timeframe === "daily") tf = "today";
    if (timeframe === "weekly") tf = "week";
    if (timeframe === "monthly") tf = "month";
    if (timeframe === "all") tf = "all_time";

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/auto-trading/leaderboard?timeframe=${tf}&limit=20`,
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const json = await res.json();
        if (json.success) {
          // Map API data back to LeaderboardEntry expected keys
          const mapped: LeaderboardEntry[] = (json.leaderboard as unknown[]).map(
            (e: unknown) => ({
              id: (e as { user_id?: string }).user_id || "",
              rank: (e as { rank?: number }).rank || 0,
              name: (e as { display_name?: string }).display_name || "Unknown",
              pnl: (e as { total_pnl?: number }).total_pnl || 0,
              pnlPercent: (e as { roi_percent?: number }).roi_percent || 0,
              trades: (e as { total_trades?: number }).total_trades || 0,
              winRate: (e as { win_rate?: number }).win_rate || 0,
              sharpeRatio: (e as { sharpe_ratio?: number }).sharpe_ratio || 0,
              maxDrawdown: (e as { max_drawdown?: number }).max_drawdown || 0,
              volatility: (e as { volatility?: number }).volatility || 0,
              strategy: (e as { strategy_id?: string }).strategy_id || "Unknown",
              sparklineData: (e as { sparkline_data?: number[] }).sparkline_data || [50, 50, 50, 50, 50, 50, 50],
              isOwnSession: (e as { is_own_session?: boolean }).is_own_session || false,
            }),
          );
          setLeaderboardData(mapped);
        } else {
          setLeaderboardData(MOCK_DATA);
        }
      } catch (e) {
        console.error("Failed to load leaderboard, using mock data", e);
        setLeaderboardData(MOCK_DATA);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [timeframe]);

  const params = useParams();
  const locale = params?.locale as string;

  // Sort leaderboard based on selected mode
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboardData];

    switch (sortMode) {
      case "risk_adjusted":
        // Sort by Sharpe ratio (risk-adjusted returns)
        sorted.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
        break;
      case "returns":
        // Sort by raw returns
        sorted.sort((a, b) => b.pnlPercent - a.pnlPercent);
        break;
      case "low_risk":
        // Sort by lowest volatility
        sorted.sort((a, b) => a.volatility - b.volatility);
        break;
    }

    // Re-assign ranks
    return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [sortMode, leaderboardData]);

  const handleCopyStrategy = async (id: string) => {
    if (!canCopyTrade) {
      toast.error(reason || "Copy trading er låst for din bruker.");
      return;
    }

    const { success, error, message } = await executeCopy(id);
    if (success) {
      setCopiedId(id);
      toast.success(message);
      setTimeout(() => setCopiedId(null), 3000);
    } else {
      toast.error(error || "Kunne ikke starte kopiering");
    }
  };

  const sortTabs: { value: SortMode; label: string }[] = [
    { value: "risk_adjusted", label: "Risikojustert" },
    { value: "returns", label: "Avkastning" },
    { value: "low_risk", label: "Lavest risiko" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top Traders</h3>
              <p className="text-xs text-slate-400">
                Rangert etter risikojustert avkastning
              </p>
            </div>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-800 p-1">
          {sortTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSortMode(tab.value)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all",
                sortMode === tab.value
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1">
          {(["daily", "weekly", "monthly", "all"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "flex-1 rounded-md py-1 text-xs font-medium transition-all",
                timeframe === tf
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              {tf === "daily"
                ? "1D"
                : tf === "weekly"
                  ? "1U"
                  : tf === "monthly"
                    ? "1M"
                    : "Alt"}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Header Row */}
      <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-800/30 px-4 py-2 text-xs font-medium text-slate-500">
        <div className="col-span-1">#</div>
        <div className="col-span-3">Trader</div>
        <div className="col-span-2 text-right">Avk.</div>
        <div className="col-span-2 text-center">Risiko</div>
        <div className="col-span-2 text-right">Max DD</div>
        <div className="col-span-2 text-right">Trend</div>
      </div>

      {/* Leaderboard List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-500">
            Henter top tradere...
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedLeaderboard.map((entry, index) => (
              <motion.div
                key={entry.id}
                layout
                layoutId={`row-${entry.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  delay: index * 0.03,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className={cn(
                  "group relative grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-800/50",
                  entry.isOwnSession && "bg-emerald-500/5",
                  entry.rank <= 3 &&
                    "bg-gradient-to-r from-yellow-500/5 to-transparent",
                )}
              >
                {/* Rank */}
                <div className="col-span-1">
                  <RankMedal rank={entry.rank} />
                </div>

                {/* Name + Strategy */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${locale}/copy-trading/traders/${entry.id}`}
                      className={cn(
                        "truncate font-semibold hover:underline",
                        entry.isOwnSession ? "text-emerald-400" : "text-white",
                      )}
                    >
                      {entry.name}
                    </Link>
                    {entry.isOwnSession && (
                      <Badge className="bg-emerald-500 text-[10px]">Du</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {entry.strategy}
                    </Badge>
                  </div>
                </div>

                {/* P&L % */}
                <div className="col-span-2 text-right">
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 font-bold",
                      entry.pnl >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {entry.pnl >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {entry.pnl >= 0 ? "+" : ""}
                    {entry.pnlPercent.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {entry.trades} handler
                  </div>
                </div>

                {/* Risk Stars */}
                <div className="col-span-2 flex flex-col items-center">
                  <RiskStars volatility={entry.volatility} />
                  <span className="mt-0.5 text-[10px] text-slate-500">
                    {entry.volatility < 20
                      ? "Lav"
                      : entry.volatility < 35
                        ? "Middels"
                        : "Høy"}
                  </span>
                </div>

                {/* Max Drawdown */}
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-1 font-medium text-red-400">
                    <ArrowDownRight className="h-3 w-3" />
                    {entry.maxDrawdown.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {entry.winRate}% win
                  </div>
                </div>

                {/* Sparkline + Copy */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <SparklineChart
                    data={entry.sparklineData}
                    isPositive={entry.pnl >= 0}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCopying}
                    className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleCopyStrategy(entry.id)}
                  >
                    {copiedId === entry.id ? (
                      <CheckIcon className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>

                {/* Hover Tooltip (Sharpe Ratio) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-emerald-400" />
                    <span className="text-slate-300">Sharpe:</span>
                    <span className="font-bold text-white">
                      {entry.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 bg-slate-800/30 p-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>Oppdateres hver time</span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Paper trading data
            </span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// Check icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
