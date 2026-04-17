"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";

interface BeatTheMarketProps {
  yourReturn?: number;
}

export function BeatTheMarket({ yourReturn }: BeatTheMarketProps) {
  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 h-full flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-4">
        <Trophy className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {yourReturn != null
          ? `Din avkastning: ${yourReturn >= 0 ? "+" : ""}${yourReturn.toFixed(2)}%`
          : "Beregner din ytelse..."}
      </h3>
      <p className="text-slate-400 text-sm max-w-xs">
        Vi henter dine faktiske trading-data og sammenligner med markedsindeksene.
      </p>
      <div className="mt-4 flex items-center gap-2 text-slate-500">
        <TrendingUp className="w-4 h-4 animate-pulse" />
        <span className="text-xs">Kommer snart</span>
      </div>
    </motion.div>
  );
}

export default BeatTheMarket;
