"use client";

import { useEffect, useState, useCallback } from "react";
import type { Database } from "@/types/database.types";

type CoinPrice = Database["public"]["Tables"]["coin_prices"]["Row"];

const COIN_LOGOS: Record<string, string> = {
  BTC: "₿",
  ETH: "⟠",
  SOL: "◎",
  XRP: "✕",
  ADA: "🅰",
  DOGE: "Ð",
  DOT: "◈",
  LINK: "⬡",
  MATIC: "⬣",
  BNB: "◆",
  AVAX: "▲",
};

function formatPrice(price: number): string {
  if (price >= 1000) {
    // Large numbers: compact with locale formatting
    return price.toLocaleString("nb-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  // Small numbers (DOGE, etc.)
  return price.toFixed(4);
}

function PriceChange({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${
        isUp ? "text-emerald-400" : "text-red-400"
      }`}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        aria-hidden
        className={isUp ? "" : "rotate-180"}
      >
        <path d="M4 1L7 6H1Z" fill="currentColor" />
      </svg>
      {isUp ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

interface Props {
  coins: CoinPrice[];
}

export default function LiveMarketTickerClient({ coins }: Props) {
  const [localCoins, setLocalCoins] = useState(coins);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/coin-prices");
      if (!res.ok) return;
      const data = (await res.json()) as CoinPrice[];
      if (!Array.isArray(data) || data.length === 0) return;

      setLocalCoins((prev) => {
        const newFlash: Record<string, "up" | "down" | null> = {};
        for (const coin of data) {
          const old = prev.find((p) => p.symbol === coin.symbol);
          if (old && old.price !== coin.price) {
            newFlash[coin.symbol] = Number(coin.price) > Number(old.price) ? "up" : "down";
          }
        }
        if (Object.keys(newFlash).length > 0) {
          setFlashMap(newFlash);
          setTimeout(() => setFlashMap({}), 600);
        }
        return data;
      });
    } catch {
      // silently retry
    }
  }, []);

  // Poll every 15s
  useEffect(() => {
    const id = setInterval(fetchPrices, 15000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  if (!localCoins || localCoins.length === 0) return null;

  return (
    <div className="bg-kp-bg-card/80 backdrop-blur-xl border border-kp-border rounded-2xl p-4 sm:p-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-semibold text-kp-text-muted uppercase tracking-wider">
          Live markeder
        </span>
      </div>

      {/* Coin grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
        {localCoins.map((coin) => {
          const symbol = coin.symbol.replace("USDT", "");
          const price = Number(coin.price);
          const pct = coin.price_change_percent_24h
            ? Number(coin.price_change_percent_24h)
            : null;
          const flash = flashMap[coin.symbol];

          return (
            <div
              key={coin.symbol}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl bg-kp-bg-primary/50 px-2 sm:px-3 py-2 sm:py-2.5 transition-colors duration-300 ${
                flash === "up"
                  ? "bg-emerald-500/10"
                  : flash === "down"
                    ? "bg-red-500/10"
                    : ""
              }`}
            >
              {/* Logo */}
              <span className="text-base sm:text-lg font-bold text-kp-text-primary shrink-0 w-5 sm:w-6 text-center">
                {COIN_LOGOS[symbol] ?? symbol.charAt(0)}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-kp-text-muted">{symbol}</span>
                  <PriceChange pct={pct} />
                </div>
                <div className="text-xs sm:text-sm font-bold text-kp-text-primary tabular-nums">
                  {formatPrice(price)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[10px] text-kp-text-muted/60 text-right">
        Oppdateres hvert 15. sekund
      </div>
    </div>
  );
}
