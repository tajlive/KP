"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Info } from "lucide-react";

interface BenchmarkItem {
  name: string;
  value: number;
  color: string;
  isYou: boolean;
  description?: string;
}

interface BeatTheMarketProps {
  yourReturn?: number;
  yourName?: string;
}

const DEFAULT_BENCHMARKS: BenchmarkItem[] = [
  {
    name: "Din strategi",
    value: 24.5,
    color: "#0052FF",
    isYou: true,
    description: "Klarpakke AI + din risikoprofil",
  },
  {
    name: "Bare holde BTC",
    value: 12.3,
    color: "#F7931A",
    isYou: false,
    description: "Kjøp og hold Bitcoin",
  },
  {
    name: "S&P 500",
    value: 8.7,
    color: "#10b981",
    isYou: false,
    description: "Tradisjonell aksjeindeks",
  },
  {
    name: "Gjennomsnittlig trader",
    value: -2.1,
    color: "#ef4444",
    isYou: false,
    description: "Typisk day-trader",
  },
];

export function BeatTheMarket({
  yourReturn = 24.5,
  yourName = "Din strategi",
}: BeatTheMarketProps) {
  // Beregn din percentile (mock)
  const percentile = 87;

  // Oppdater "Din strategi" med faktisk verdi
  const benchmarks = DEFAULT_BENCHMARKS.map((b) =>
    b.isYou ? { ...b, value: yourReturn, name: yourName } : b
  );

  // Sorter etter avkastning (høyest først)
  const sortedBenchmarks = [...benchmarks].sort((a, b) => b.value - a.value);

  // Finn maks for å normalisere bar-lengder
  const maxValue = Math.max(...benchmarks.map((b) => Math.abs(b.value)));

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Du slår {percentile}% av tradere
            </h3>
            <p className="text-slate-400 text-sm">Siste 30 dager</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {sortedBenchmarks.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {item.isYou && <span className="text-lg">⭐</span>}
                <span
                  className={`text-sm font-medium ${
                    item.isYou ? "text-white" : "text-slate-400"
                  }`}
                >
                  {item.name}
                </span>
                {item.description && (
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-slate-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {item.description}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.value > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-bold ${
                    item.value > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {item.value > 0 ? "+" : ""}
                  {item.value}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.max(5, (Math.abs(item.value) / maxValue) * 100)}%`,
                }}
                transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Utdypende info */}
      <motion.div
        className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-400 text-sm">
              💡 <strong>Du er på vei mot topp 10%!</strong>
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Hvis du hadde investert 10,000 kr i S&P 500, ville du hatt 10,870 kr.
              Med din nåværende strategi: <strong className="text-white">12,450 kr</strong>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Ekstra statistikk */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-white">#42</p>
          <p className="text-xs text-slate-500">Rangering</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">+2,450</p>
          <p className="text-xs text-slate-500">kr tjent</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">73%</p>
          <p className="text-xs text-slate-500">Win rate</p>
        </div>
      </div>
    </motion.div>
  );
}

export default BeatTheMarket;
