"use client";

import { motion } from "framer-motion";
import { Crown, TrendingUp, Users, ArrowRight, Star } from "lucide-react";
import { useState } from "react";

interface Trader {
  id: string;
  name: string;
  pnl: number;
  winRate: number;
  followers: number;
  avatar: string;
  rank: number;
  strategy: string;
  streak: number;
}

const TOP_TRADERS: Trader[] = [
  {
    id: "1",
    name: "CryptoViking",
    pnl: 156000,
    winRate: 73,
    followers: 1240,
    avatar: "🧔",
    rank: 1,
    strategy: "DCA + Grid",
    streak: 15,
  },
  {
    id: "2",
    name: "MoonShot",
    pnl: 98000,
    winRate: 68,
    followers: 892,
    avatar: "🚀",
    rank: 2,
    strategy: "Trend Following",
    streak: 8,
  },
  {
    id: "3",
    name: "DCA_Master",
    pnl: 72000,
    winRate: 81,
    followers: 2103,
    avatar: "📊",
    rank: 3,
    strategy: "Pure DCA",
    streak: 23,
  },
  {
    id: "4",
    name: "AltcoinQueen",
    pnl: 64500,
    winRate: 71,
    followers: 756,
    avatar: "👑",
    rank: 4,
    strategy: "Multi-Signal",
    streak: 12,
  },
  {
    id: "5",
    name: "RiskManager",
    pnl: 58200,
    winRate: 85,
    followers: 1543,
    avatar: "🛡️",
    rank: 5,
    strategy: "Conservative",
    streak: 31,
  },
];

const RANK_COLORS: Record<number, string> = {
  1: "from-yellow-400 via-orange-500 to-yellow-600",
  2: "from-slate-300 via-slate-400 to-slate-500",
  3: "from-amber-600 via-amber-700 to-amber-800",
};

interface TopTradersPreviewProps {
  onCopyTrader?: (traderId: string) => void;
}

export function TopTradersPreview({ onCopyTrader }: TopTradersPreviewProps) {
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [hoveredTrader, setHoveredTrader] = useState<string | null>(null);

  const handleCopy = (traderId: string) => {
    setSelectedTrader(traderId);
    onCopyTrader?.(traderId);
    // Simuler API call
    setTimeout(() => setSelectedTrader(null), 2000);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">👑 Topp tradere</h3>
            <p className="text-slate-500 text-sm">Denne månedens beste</p>
          </div>
        </div>

        <button className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300 transition-colors group">
          Se alle
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Traders list */}
      <div className="space-y-3">
        {TOP_TRADERS.map((trader, index) => (
          <motion.div
            key={trader.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
              hoveredTrader === trader.id
                ? "bg-slate-800 border-blue-500/30 shadow-lg shadow-blue-500/10"
                : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
            }`}
            onMouseEnter={() => setHoveredTrader(trader.id)}
            onMouseLeave={() => setHoveredTrader(null)}
          >
            {/* Rank badge */}
            <div
              className={`absolute -left-2 -top-2 w-8 h-8 rounded-full bg-gradient-to-br ${
                RANK_COLORS[trader.rank] || "from-slate-600 to-slate-700"
              } flex items-center justify-center text-white font-bold text-sm shadow-lg`}
            >
              #{trader.rank}
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-2xl border border-slate-600">
                {trader.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold truncate">{trader.name}</p>
                  {trader.streak >= 20 && (
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                      🔥 {trader.streak}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {trader.followers.toLocaleString()}
                  </span>
                  <span>{trader.strategy}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className="text-emerald-400 font-bold">
                  +{trader.pnl.toLocaleString()} kr
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {trader.winRate}% win rate
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={() => handleCopy(trader.id)}
                disabled={selectedTrader === trader.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTrader === trader.id
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                }`}
              >
                {selectedTrader === trader.id ? "✓ Kopiert!" : "Kopier"}
              </button>
            </div>

            {/* Hover preview */}
            {hoveredTrader === trader.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3 text-center"
              >
                <div>
                  <p className="text-lg font-bold text-white">{trader.streak}</p>
                  <p className="text-xs text-slate-500">Dagers streak</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">24</p>
                  <p className="text-xs text-slate-500">Trader/mnd</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-400">+12%</p>
                  <p className="text-xs text-slate-500">Siste 30d</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl border border-yellow-500/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-yellow-400 text-sm">
              💡 <strong>Hvis du hadde kopiert CryptoViking</strong> for 30 dager siden,
              ville du tjent <strong className="text-white">15,600 kr</strong> på 10,000 kr investert
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TopTradersPreview;
