"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CoinbaseHome } from "@/features/coinbase/CoinbaseHome";
import { DashboardPro } from "./DashboardPro";
import { RiskMetricsPanel } from "./RiskMetricsPanel";

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
    winningTrades?: number;
  };
  onboardingCompleted?: boolean;
  userName?: string;
}

export function DashboardContent({
  paperBalance,
  trades,
  activeSession,
  stats,
  onboardingCompleted,
  userName,
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
            sessionMode={activeSession?.mode ?? "paper"}
            initialStats={stats}
            trades={trades}
            onboardingCompleted={onboardingCompleted}
            userName={userName}
          />
        ) : (
          <CoinbaseHome
            paperBalance={effectiveBalance}
            trades={trades}
            activeSession={activeSession}
          />
        )}
        {useProDashboard && (
          <div className="bg-slate-950 px-4 md:px-8 pb-8">
            <div className="max-w-7xl mx-auto">
              <RiskMetricsPanel />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
