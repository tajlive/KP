"use client";

import { ChartTimeframe } from "@/types/pulse";
import { motion } from "framer-motion";

interface PulseTimeframeTabsProps {
  activeTimeframe: ChartTimeframe;
  onTimeframeChange: (timeframe: ChartTimeframe) => void;
}

const TIMEFRAMES: ChartTimeframe[] = ["1D", "7D", "30D", "ALL"];

export function PulseTimeframeTabs({
  activeTimeframe,
  onTimeframeChange,
}: PulseTimeframeTabsProps) {
  return (
    <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 self-end">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onTimeframeChange(tf)}
          className={`relative px-4 py-1.5 text-xs font-bold transition-all duration-200 outline-none ${
            activeTimeframe === tf
              ? "text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="relative z-10">{tf}</span>
          {activeTimeframe === tf && (
            <motion.div
              layoutId="pulse-timeframe-active"
              className="absolute inset-0 bg-slate-800 rounded-lg shadow-sm border border-white/5"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
