"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Zap } from "lucide-react";

const mockSignals = [
  {
    pair: "BTC/USDT",
    type: "LONG",
    price: "$42,450",
    profit: "+2.4%",
    time: "2t siden",
  },
  {
    pair: "ETH/USDT",
    type: "SHORT",
    price: "$2,280",
    profit: "+1.8%",
    time: "5t siden",
  },
  {
    pair: "SOL/USDT",
    type: "LONG",
    price: "$98.20",
    profit: "+4.1%",
    time: "12t siden",
  },
  {
    pair: "BNB/USDT",
    type: "LONG",
    price: "$312",
    profit: "+0.9%",
    time: "18t siden",
  },
];

export function LiveSignalFeed() {
  return (
    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <Zap className="h-3 w-3 text-blue-500" /> Siste Real-Time Signaler
        </span>
      </div>

      <div className="space-y-2">
        {mockSignals.map((sig, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="font-bold text-sm text-slate-900">{sig.pair}</div>
              <div
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  sig.type === "LONG"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {sig.type}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500">{sig.price}</div>
              <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                {sig.profit} <ArrowUpRight className="h-3 w-3" />
              </div>
              <div className="text-[10px] text-slate-400 w-16 text-right">
                {sig.time}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
        <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight">
          Se alle historiske signaler →
        </button>
      </div>
    </div>
  );
}
