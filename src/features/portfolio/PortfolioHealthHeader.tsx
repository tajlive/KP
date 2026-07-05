"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { useBinancePrices } from "@/hooks/useBinancePrices";
import { m } from "framer-motion";

interface Props {
  wallets: WalletData[];
  config: RebalanceConfig | null;
}

interface WalletData {
  currency: string;
  balance: number;
}

interface RebalanceConfig {
  target_allocations: Record<string, number>;
}

export function PortfolioHealthHeader({ wallets, config }: Props) {
  const symbols = config ? Object.keys(config.target_allocations) : ["BTC", "ETH", "SOL", "BNB", "XRP"];
  const currentPrices = useBinancePrices(symbols);
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    if (!config || Object.keys(currentPrices).length <= 1) return;
    
    let totalValue = 0;
    const values: Record<string, number> = {};
    
    wallets.forEach(w => {
      const price = currentPrices[w.currency] || (w.currency === "USDT" ? 1 : 0);
      const val = w.balance * price;
      values[w.currency] = val;
      totalValue += val;
    });

    if (totalValue > 0) {
      let totalDrift = 0;
      Object.keys(config.target_allocations).forEach(sym => {
        const currentWeight = (values[sym] || 0) / totalValue;
        const targetWeight = config.target_allocations[sym];
        totalDrift += Math.abs(currentWeight - targetWeight);
      });

      setHealthScore(Math.max(0, Math.min(100, Math.round(100 - (totalDrift * 100)))));
    }
  }, [currentPrices, wallets, config]);

  if (!config) return null;

  return (
    <m.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10"
    >
      <div className={`p-1.5 rounded-full ${healthScore > 90 ? 'bg-emerald-500/20 text-emerald-500' : healthScore > 70 ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'}`}>
        {healthScore > 90 ? <ShieldCheck className="w-4 h-4" /> : <Activity className="w-4 h-4 animate-pulse" />}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Health Score</span>
        <span className={`text-sm font-black ${healthScore > 90 ? 'text-emerald-500' : healthScore > 70 ? 'text-amber-500' : 'text-rose-500'}`}>
          {healthScore}%
        </span>
      </div>
    </m.div>
  );
}
