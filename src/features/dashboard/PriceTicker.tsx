"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CoinPrice {
  symbol: string;
  price: number;
  change24h: number;
}

export function PriceTicker() {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market/snapshot");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setPrices(data.assets?.slice(0, 8) ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (error || prices.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl bg-[#0A0D12] border border-[#1E2530]">
      <div className="flex gap-6 overflow-x-auto px-4 py-2.5 scrollbar-hide">
        {prices.map((c) => (
          <div key={c.symbol} className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-white">{c.symbol}</span>
            <span className="text-sm font-mono text-slate-300">
              {c.price.toLocaleString("no-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              c.change24h >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {c.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
