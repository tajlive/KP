"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";
import { MockTrade } from "./types";

interface TradeExampleCardProps {
  trade: MockTrade;
  isWin: boolean;
}

export function TradeExampleCard({ trade, isWin }: TradeExampleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "rounded-xl border-2 p-4",
        isWin
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-green-500/5"
          : "border-red-500/50 bg-gradient-to-br from-red-500/10 to-orange-500/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{trade.pair}</span>
          <Badge
            variant={trade.side === "BUY" ? "default" : "secondary"}
            className={cn(
              trade.side === "BUY" ? "bg-blue-500" : "bg-amber-500",
            )}
          >
            {trade.side === "BUY" ? "KJØP" : "SALG"}
          </Badge>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-2xl font-bold",
              isWin ? "text-emerald-400" : "text-red-400",
            )}
          >
            {isWin ? "+" : ""}
            {trade.pnlPercent}%
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Beløp: ${trade.amount.toLocaleString()}
        </span>
        <Badge variant="outline">{trade.strategy}</Badge>
      </div>

      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ delay: 0.8 }}
        className="rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300"
      >
        <span className="font-semibold text-slate-200">AI forklaring: </span>
        {trade.aiExplanation}
      </motion.div>

      {isWin && (
        <motion.div
          className="mt-3 flex items-center gap-2 text-emerald-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">
            Bra trekk! Strategien fungerte som forventet.
          </span>
        </motion.div>
      )}

      {!isWin && (
        <motion.div
          className="mt-3 flex items-center gap-2 text-amber-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">
            Risikostyring fungerte - tapet var kontrollert.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
