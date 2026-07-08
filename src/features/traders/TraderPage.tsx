"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Target, BarChart3, Clock, Info } from "lucide-react";
import { LiveCandlestickChart } from "@/features/charts/LiveCandlestickChart";
import { EquityCurveChart } from "@/features/charts/EquityCurveChart";

interface Trade {
  time: number;
  price: number;
  side: "buy" | "sell";
  pnl?: number;
  symbol: string;
  quantity: number;
  reason: string;
}

export function TraderPage() {
  const { id } = useParams<{ id: string }>();
  const [trader, setTrader] = useState<any>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    // This would fetch from API in production
    setTrader({
      name: "Silje Lund",
      tier: "Professor",
      winRate: 82,
      totalTrades: 47,
      totalPnl: 28450,
      bestTrade: 12400,
      worstTrade: -3200,
      currentBalance: 128450,
    });
    setTrades([
      { time: Date.now() / 1000 - 3600, price: 67200, side: "buy", symbol: "BTCUSDT", quantity: 0.015, pnl: 0, reason: "RSI oversolgt (28) + Golden Cross" },
      { time: Date.now() / 1000 - 2400, price: 68400, side: "sell", symbol: "BTCUSDT", quantity: 0.015, pnl: 1800, reason: "Nådde take-profit +3% — automatisk salg" },
      { time: Date.now() / 1000 - 3600, price: 3480, side: "buy", symbol: "ETHUSDT", quantity: 0.5, pnl: 0, reason: "EMA-crossover på 1t + volumøkning" },
      { time: Date.now() / 1000 - 4800, price: 149, side: "buy", symbol: "SOLUSDT", quantity: 5, pnl: 0, reason: "Bollinger Band nedre + RSI 32" },
    ]);
  }, [id]);

  if (!trader) return null;

  return (
    <div className="min-h-screen bg-black">
      {/* Profile Header */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-blue-500/[0.04]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
              {trader.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{trader.name}</h1>
              <p className="text-sm text-zinc-500">{trader.tier} · {trader.winRate}% win-rate</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-white tabular-nums">
                {trader.currentBalance.toLocaleString("no")} kr
              </p>
              <p className={`text-sm font-medium ${trader.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {trader.totalPnl >= 0 ? "+" : ""}{trader.totalPnl.toLocaleString("no")} kr
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
              <Target className="w-3.5 h-3.5" /> {trader.winRate}% vinnere
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
              <BarChart3 className="w-3.5 h-3.5" /> {trader.totalTrades} handler
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Beste: +{trader.bestTrade.toLocaleString("no")} kr
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Equity curve */}
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4">
            <EquityCurveChart startingCapital={100000} height={250} />
          </div>

          {/* Live price chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              BTCUSDT · Live
            </p>
            <LiveCandlestickChart trades={trades} symbol="BTCUSDT" height={250} />
          </div>
        </div>

        {/* Trade History */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-bold text-white">Siste handler</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {trades.map((trade, i) => (
              <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  {/* Side icon */}
                  <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${
                    trade.side === "buy" ? "bg-blue-500/10" : "bg-rose-500/10"
                  }`}>
                    {trade.side === "buy" ? (
                      <ArrowDownRight className={`w-4 h-4 ${trade.side === "buy" ? "text-blue-400" : "text-rose-400"}`} />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-white">{trade.symbol}</span>
                      <span className={`text-xs font-semibold ${trade.side === "buy" ? "text-blue-400" : "text-rose-400"}`}>
                        {trade.side === "buy" ? "Kjøp" : "Salg"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Info className="w-3 h-3 text-zinc-600" />
                      <p className="text-xs text-zinc-500 truncate">{trade.reason}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-white tabular-nums">
                      {trade.price.toLocaleString("no")} kr
                    </p>
                    {trade.pnl ? (
                      <p className={`text-xs font-semibold ${trade.pnl > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {trade.pnl > 0 ? "+" : ""}{trade.pnl.toLocaleString("no")} kr
                      </p>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-zinc-600">
                        <Clock className="w-3 h-3" />
                        {Math.round((Date.now() / 1000 - trade.time) / 60)}m siden
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
