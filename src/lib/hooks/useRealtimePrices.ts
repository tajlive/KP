"use client";

import { useCallback, useEffect, useState } from "react";

export interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  lastUpdated: Date;
}

const COIN_NAMES: { [key: string]: string } = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  SOLUSDT: "Solana",
  ADAUSDT: "Cardano",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  AVAXUSDT: "Avalanche",
  DOTUSDT: "Polkadot",
  LINKUSDT: "Chainlink",
  UNIUSDT: "Uniswap",
  POLUSDT: "Polygon",
};

const POLL_MS = 15_000; // Keep polling conservative to reduce runtime/API load.

/**
 * Sanntidspriser (poll) via egen API-rute → Kraken (EU/EØS 2026:
 * Binance geo-blokkert, Kraken eneste tallkilde).
 * Krever ikke innlogging; unngår CORS.
 */
export function useRealtimePrices(
  symbols: string[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT"],
) {
  const [coins, setCoins] = useState<CoinPrice[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbolsKey = symbols.join(",");

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/market/binance-24hr?symbols=${encodeURIComponent(symbolsKey)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        prices?: Array<{ symbol: string; price: number; change24h: number }>;
        source?: string;
      };
      const prices = body.prices ?? [];
      const apiSource = body.source ?? "binance";

      const formattedCoins: CoinPrice[] = symbolsKey
        .split(",")
        .map((symbol) => {
          const sym = symbol.trim().toUpperCase();
          const row =
            prices.find((p) => p.symbol.toUpperCase() === sym) ?? null;
          return {
            symbol: sym,
            name: COIN_NAMES[sym] || sym,
            price: row?.price ?? 0,
            change24h: row?.change24h ?? 0,
            lastUpdated: new Date(),
          };
        });

      setCoins(formattedCoins);
      setSource(apiSource);
      setError(null);
    } catch (err) {
      // EU/EØS (2026): ingen klient-direkte Binance-kall (geo-blokkert).
      // Ruten faller tilbake til DB-cache; her nullstiller vi bare stille.
      console.error("Error fetching prices:", err);
      setError("Kunne ikke hente priser");
    } finally {
      setLoading(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { coins, source, loading, error, refresh: fetchPrices };
}
