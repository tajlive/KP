"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CoinbaseHome } from "@/features/coinbase/CoinbaseHome";
import { SkeletonDashboard } from "@/shared/ui/skeleton";

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

interface DashboardContentProps {
  paperBalance: number;
  trades: TradeRow[];
  activeSession?: ActiveSession;
}

export function DashboardContent({
  paperBalance,
  trades,
  activeSession,
}: DashboardContentProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading state to show skeleton
    // In production, this would be replaced with actual data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <SkeletonDashboard />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <CoinbaseHome
            paperBalance={paperBalance}
            trades={trades}
            activeSession={activeSession}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
