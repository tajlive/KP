"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CoinbaseHome } from "@/features/coinbase/CoinbaseHome";
import { DashboardPro } from "./DashboardPro";

type TradeRow = {
  trading_pair: string;
  side: string;
  quantity: number | null;
  realized_pnl: number | null;
};

type ActiveSession = {
  id: string;
  mode: string;
  status: string;
  strategy_id: string | null;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number | null;
  total_trades: number | null;
  winning_trades: number | null;
  created_at: string | null;
  updated_at: string | null;
} | null;

export interface DashboardContentProps {
  paperBalance: number;
  trades: TradeRow[];
  activeSession?: ActiveSession;
  stats?: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    currentCapital: number;
    startingCapital: number;
  };
}

export function DashboardContent({
  paperBalance,
  trades,
  activeSession,
  stats,
}: DashboardContentProps) {
  const effectiveBalance = activeSession?.current_capital_nok ?? paperBalance;
  const [useProDashboard] = useState(true);

  return (
    <div suppressHydrationWarning>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {useProDashboard ? (
          <DashboardPro 
            paperBalance={effectiveBalance}
            sessionId={activeSession?.id}
            initialStats={stats}
            trades={trades}
          />
        ) : (
          <CoinbaseHome
            paperBalance={effectiveBalance}
            trades={trades}
            activeSession={activeSession}
          />
        )}
      </motion.div>
    </div>
  );
}
