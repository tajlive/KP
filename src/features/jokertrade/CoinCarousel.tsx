"use client";

import { AIBrainIcon } from "./JokerIcons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoinSignal {
  symbol: string;
  name: string;
  signal: "long" | "short" | "hold";
  confidence: number;
  reason: string;
}

const COINS: CoinSignal[] = [
  { symbol: "BTC", name: "Bitcoin", signal: "hold", confidence: 65, reason: "RSI=48 — venter" },
  { symbol: "ETH", name: "Ethereum", signal: "long", confidence: 72, reason: "ETF-nyheter + RSI=42" },
  { symbol: "SOL", name: "Solana", signal: "short", confidence: 58, reason: "NFT-volum -40%" },
  { symbol: "ADA", name: "Cardano", signal: "hold", confidence: 40, reason: "Lav aktivitet" },
  { symbol: "DOT", name: "Polkadot", signal: "long", confidence: 63, reason: "Oppgradering neste uke" },
  { symbol: "XRP", name: "XRP", signal: "hold", confidence: 35, reason: "Pending SEC-avgjørelse" },
  { symbol: "LINK", name: "Chainlink", signal: "long", confidence: 70, reason: "Ny integrasjon, volum +200%" },
  { symbol: "AVAX", name: "Avalanche", signal: "hold", confidence: 45, reason: "Ingen katalysator" },
  { symbol: "MATIC", name: "Polygon", signal: "short", confidence: 52, reason: "Konkurranse zkEVM" },
  { symbol: "INJ", name: "Injective", signal: "long", confidence: 68, reason: "Lansering av ny DEX" },
];

// ---------------------------------------------------------------------------
// Signal-farge
// ---------------------------------------------------------------------------

function signalColor(signal: CoinSignal["signal"]) {
  switch (signal) {
    case "long": return { dot: "bg-emerald-400 shadow-emerald-400/50", border: "border-emerald-400/30", badge: "KJØP", badgeBg: "bg-emerald-500/10 text-emerald-400" };
    case "short": return { dot: "bg-red-400 shadow-red-400/50", border: "border-red-400/30", badge: "SELG", badgeBg: "bg-red-500/10 text-red-400" };
    case "hold": return { dot: "bg-slate-600 shadow-slate-600/30", border: "border-slate-600/30", badge: "VENT", badgeBg: "bg-slate-700 text-slate-400" };
  }
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export function CoinCarousel({ insight }: { insight: string | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AIBrainIcon className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          AI SCORER 10 COINS
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {COINS.map((coin) => {
          const colors = signalColor(coin.signal);
          return (
            <div
              key={coin.symbol}
              className={`relative border rounded-xl p-3 transition-all duration-300 backdrop-blur-sm ${colors.border}
                ${coin.signal === "long" ? "bg-emerald-500/5" : coin.signal === "short" ? "bg-red-500/5" : "bg-slate-800/40"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{coin.symbol}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${colors.badgeBg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shadow-lg`} />
                  {colors.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{coin.reason}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${coin.confidence > 60 ? "bg-emerald-400" : coin.confidence > 40 ? "bg-amber-400" : "bg-slate-600"}`}
                    style={{ width: `${coin.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">{coin.confidence}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {insight && (
        <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-400 mb-1">🧠 HVA AI-EN TENKER NÅ:</p>
          <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
}
