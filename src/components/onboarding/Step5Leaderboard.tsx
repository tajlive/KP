"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { MOCK_LEADERBOARD } from "./constants";

export function Step5Leaderboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="border-b border-slate-800 bg-slate-800/50 p-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tight text-slate-400">
          <span>Trader</span>
          <span>Avkastning</span>
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {MOCK_LEADERBOARD.map((user, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "flex items-center justify-between p-3",
              user.isUser && "border-l-4 border-emerald-500 bg-emerald-500/5",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-slate-500">
                {user.rank}
              </span>
              <span
                className={cn(
                  "text-sm",
                  user.isUser ? "font-bold text-emerald-400" : "text-slate-300",
                )}
              >
                {user.name}
              </span>
              {user.isUser && (
                <Badge className="bg-emerald-500 text-xs">Du</Badge>
              )}
            </div>
            <span
              className={cn(
                "text-sm font-bold",
                user.pnl.startsWith("+") ? "text-emerald-400" : "text-red-400",
              )}
            >
              {user.pnl}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
