"use client";

import { useEffect, useState, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

interface TickerCoin {
  id: string;
  symbol: string;
  name: string;
  emoji: string;
}

const TICKER_COINS: TickerCoin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", emoji: "₿" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", emoji: "⟠" },
  { id: "solana", symbol: "SOL", name: "Solana", emoji: "◎" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  if (price >= 1000) {
    return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PriceTicker() {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };

    async function fetchPrices() {
      try {
        const ids = TICKER_COINS.map((c) => c.id).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const result: CoinPrice[] = TICKER_COINS.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          current_price: json[coin.id]?.usd ?? 0,
          price_change_percentage_24h: json[coin.id]?.usd_24h_change ?? 0,
          image: "",
        }));

        if (mountedRef.current) {
          setPrices(result);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-6 py-3">
        {TICKER_COINS.map((coin) => (
          <div key={coin.id} className="flex items-center gap-2">
            <span className="text-lg">{coin.emoji}</span>
            <div className="space-y-1">
              <div className="h-3 w-12 rounded bg-[#2A2D35] animate-pulse" />
              <div className="h-3 w-16 rounded bg-[#2A2D35] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 py-3 overflow-x-auto scrollbar-hide">
      {prices.map((coin) => {
        const isPositive = coin.price_change_percentage_24h >= 0;
        const tickerCoin = TICKER_COINS.find((c) => c.id === coin.id);
        return (
          <div
            key={coin.id}
            className="flex items-center gap-2 sm:gap-3 shrink-0 px-3 sm:px-4 py-2 rounded-xl border border-[#2A2D35] bg-[#15171B]/80 backdrop-blur-sm"
          >
            <span className="text-xl sm:text-2xl">{tickerCoin?.emoji}</span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#F9FAFB] tabular-nums">
                {coin.symbol}
              </p>
              <p className="text-xs sm:text-sm font-mono font-bold text-[#F9FAFB] tabular-nums">
                {formatPrice(coin.current_price)}
              </p>
              <p
                className={`text-[10px] sm:text-xs font-semibold tabular-nums ${
                  isPositive ? "text-[#10B981]" : "text-[#EF4444]"
                }`}
              >
                {isPositive ? "▲" : "▼"} {formatChange(coin.price_change_percentage_24h)}
              </p>
            </div>
          </div>
        );
      })}
      {error && (
        <p className="text-[10px] text-[#6B7280]">Kunne ikke laste priser</p>
      )}
    </div>
  );
}
