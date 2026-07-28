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
  binanceSymbol: string;
}

const TICKER_COINS: TickerCoin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", emoji: "₿", binanceSymbol: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", emoji: "⟠", binanceSymbol: "ETHUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", emoji: "◎", binanceSymbol: "SOLUSDT" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPriceNOK(price: number): string {
  return price.toLocaleString("no-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";
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
  const [usdtNok, setUsdtNok] = useState<number>(10.8);
  const mountedRef = useRef(true);

  // Hent USDT→NOK-rate
  useEffect(() => {
    fetch("/api/fx/usdt-nok")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.rate === "number" && d.rate > 0) setUsdtNok(d.rate);
      })
      .catch(() => {});
  }, []);

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
        const symbols = TICKER_COINS.map((c) => c.binanceSymbol).join(",");
        const res = await fetch(
          `/api/market/binance-24hr?symbols=${encodeURIComponent(symbols)}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const apiPrices: Array<{ symbol: string; price: number; change24h: number }> = body.prices ?? [];

        const result: CoinPrice[] = TICKER_COINS.map((coin) => {
          const match = apiPrices.find((p) => p.symbol === coin.binanceSymbol);
          const usdtPrice = match?.price ?? 0;
          return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            current_price: usdtPrice * usdtNok,
            price_change_percentage_24h: match?.change24h ?? 0,
            image: "",
          };
        });

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
  }, [usdtNok]);

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
                {formatPriceNOK(coin.current_price)}
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
