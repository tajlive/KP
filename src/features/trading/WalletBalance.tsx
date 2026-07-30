"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BalanceData {
  balance: { current: number; starting: number };
  recentTrades: Array<{ total_value: number; side: string }>;
}

export function WalletBalance() {
  const [data, setData] = React.useState<BalanceData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      try {
        const res = await fetch("/api/paper-trading/balance");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.balance) {
          setData(json as BalanceData);
        }
      } catch {
        // Stille — ikke forstyrr brukeren
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBalance();
    return () => { cancelled = true; };
  }, []);

  // Ikke vis noe mens vi laster eller hvis bruker ikke er logget inn
  if (loading || !data) return null;

  const { current, starting } = data.balance;
  const pnl = current - starting;
  const pnlPct = starting > 0 ? (pnl / starting) * 100 : 0;
  const isPositive = pnl >= 0;

  // Teller handler i dag (antar at recentTrades fra API er siste 24h)
  const tradesToday = data.recentTrades?.length ?? 0;

  return (
    <div className="flex items-center gap-4 bg-[#0A0D12] border border-[#1E2530] rounded-xl px-4 py-2.5">
      {/* Saldo */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">💰</span>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-tight">
            Lekepenger
          </div>
          <div className="text-white text-sm font-bold font-mono leading-tight">
            {Math.round(current).toLocaleString("nb-NO")} kr
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-[#1E2530]" />

      {/* P&L */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs font-bold font-mono",
          isPositive ? "text-emerald-400" : "text-red-400",
        )}>
          {isPositive ? "+" : ""}{Math.round(pnl).toLocaleString("nb-NO")} kr
        </span>
        <span className={cn(
          "text-[11px] font-medium",
          isPositive ? "text-emerald-400/70" : "text-red-400/70",
        )}>
          ({isPositive ? "+" : ""}{pnlPct.toFixed(1)}%)
        </span>
      </div>

      {/* Handler i dag — kun hvis > 0 */}
      {tradesToday > 0 && (
        <>
          <div className="w-px h-8 bg-[#1E2530]" />
          <div className="text-[11px] text-slate-500">
            <span className="text-slate-400 font-medium">{tradesToday}</span> handler i dag
          </div>
        </>
      )}
    </div>
  );
}
