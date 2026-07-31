"use client";

import { useEffect, useState } from "react";

interface JokerAnalytics {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  trades: Array<{
    id: string;
    trading_pair: string;
    side: string;
    total_value: number;
    realized_pnl: number | null;
    joker_explanation: string | null;
    created_at: string;
  }>;
  byCoin: Array<{
    coin: string;
    trades: number;
    pnl: number;
    winRate: number;
  }>;
}

export default function JokerTradeDashboard() {
  const [data, setData] = useState<JokerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pilot", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => setData(d.analytics))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#8B9DC3]">Laster...</div>;
  }

  if (error || !data) {
    return <div className="text-red-400 p-4">{error || "Ingen data"}</div>;
  }

  const formatNok = (n: number) =>
    new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);

  const formatCoin = (pair: string) => pair.replace("USDT", "");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">🎭 Pilot</h1>
      <p className="text-[#8B9DC3] text-sm">AI-drevet papirhandel — automatisk hvert 15. minutt</p>

      {/* Stats-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Resultat"
          value={formatNok(data.totalPnl)}
          color={data.totalPnl >= 0 ? "text-green-400" : "text-red-400"}
        />
        <StatCard label="Win-rate" value={`${data.winRate.toFixed(0)}%`} color="text-[#60A5FA]" />
        <StatCard label="Vinner" value={`${data.winningTrades}`} color="text-green-400" />
        <StatCard label="Taper" value={`${data.losingTrades}`} color="text-red-400" />
      </div>

      {/* Per-coin */}
      {data.byCoin.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Per kryptovaluta</h2>
          <div className="space-y-1">
            {data.byCoin.map(c => (
              <div key={c.coin} className="flex items-center justify-between bg-[#1A1F2E] rounded px-3 py-2 text-sm">
                <span className="text-white font-medium">{formatCoin(c.coin)}</span>
                <span className="text-[#8B9DC3]">{c.trades} handler</span>
                <span className={c.pnl >= 0 ? "text-green-400" : "text-red-400"}>{formatNok(c.pnl)}</span>
                <span className="text-[#60A5FA]">{c.winRate.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Siste handler med forklaring */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Siste handler</h2>
        <div className="space-y-2">
          {data.trades.slice(0, 10).map(trade => (
            <div key={trade.id} className="bg-[#1A1F2E] rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={trade.side === "buy" ? "text-green-400" : "text-red-400"}>
                    {trade.side === "buy" ? "KJØP" : "SALG"}
                  </span>
                  <span className="text-white font-medium">{formatCoin(trade.trading_pair)}</span>
                  {trade.realized_pnl !== null && (
                    <span className={trade.realized_pnl > 0 ? "text-green-400" : "text-red-400"}>
                      {formatNok(trade.realized_pnl)}
                    </span>
                  )}
                </div>
                <span className="text-[#8B9DC3] text-xs">
                  {new Date(trade.created_at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {trade.joker_explanation && (
                <p className="text-[#8B9DC3] text-xs mt-1 leading-relaxed">{trade.joker_explanation}</p>
              )}
            </div>
          ))}
        </div>
        {data.trades.length === 0 && (
          <p className="text-[#8B9DC3] text-sm p-4">Ingen handler ennå. Pilot kjører automatisk hvert 15. minutt.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1A1F2E] rounded-lg p-4">
      <p className="text-[#8B9DC3] text-xs mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
