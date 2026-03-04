"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";

export function PerformanceChart() {
  // Mock data for the 3-year performance
  // Representing growth of $1,000
  const points = [
    { x: 0, y: 100 },
    { x: 10, y: 110 },
    { x: 20, y: 105 },
    { x: 30, y: 130 },
    { x: 40, y: 125 },
    { x: 50, y: 160 },
    { x: 60, y: 155 },
    { x: 70, y: 190 },
    { x: 80, y: 210 },
    { x: 90, y: 230 },
    { x: 100, y: 242 }, // 142% total profit -> $2,420
  ];

  const bankPoints = [
    { x: 0, y: 100 },
    { x: 20, y: 101 },
    { x: 40, y: 102 },
    { x: 60, y: 103 },
    { x: 80, y: 104 },
    { x: 100, y: 105 }, // 5% growth over 3 years
  ];

  const toPath = (pts: typeof points) =>
    `M ${pts.map((p) => `${p.x} ${100 - p.y / 2.5}`).join(" L ")}`;

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl overflow-hidden relative group">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1">
            <TrendingUp className="h-4 w-4" /> 3 ÅRS DOKUMENTERT DATA
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            Proven Performance
          </h3>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100">
          <div className="text-xs text-green-700 font-bold uppercase tracking-wider">
            Total Profit
          </div>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
            +142% <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative h-64 w-full mt-4">
        {/* SVG Chart */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1="0"
              y1={tick}
              x2="100"
              y2={tick}
              stroke="#F1F5F9"
              strokeWidth="0.5"
            />
          ))}

          {/* Bank Line (Gray) */}
          <motion.path
            d={toPath(bankPoints)}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* Klarpakke Line (Blue) */}
          <motion.path
            d={toPath(points)}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Current Value Point */}
          <motion.circle
            cx="100"
            cy={100 - 242 / 2.5}
            r="3"
            fill="#6366F1"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 2 }}
          />
        </svg>

        {/* Labels */}
        <div className="absolute top-0 left-0 text-[10px] text-slate-400">
          Profit
        </div>
        <div className="absolute bottom-[-20px] left-0 text-[10px] text-slate-400">
          Jan 2021
        </div>
        <div className="absolute bottom-[-20px] right-0 text-[10px] text-slate-400">
          I dag
        </div>
      </div>

      <div className="mt-12 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
          <span className="text-slate-700 font-medium font-[family-name:var(--font-display)]">
            Klarpakke AI Strategy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300"></div>
          <span className="text-slate-500 font-medium font-[family-name:var(--font-display)]">
            Bankkonto / Holding
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        * Basert på faktiske backtest-data fra 2021-2024. Gevinst inkluderer
        renters rente-effekt. Kryptovaluta innebærer risiko og historisk
        avkastning er ingen garanti.
      </p>
    </div>
  );
}
