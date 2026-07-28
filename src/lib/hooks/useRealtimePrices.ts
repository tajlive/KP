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
  BNBUSDT: "BNB",
  ADAUSDT: "Cardano",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  AVAXUSDT: "Avalanche",
  DOTUSDT: "Polkadot",
  LINKUSDT: "Chainlink",
  MATICUSDT: "Polygon",
};

const POLL_MS = 15_000; // Keep polling conservative to reduce runtime/API load.

/**
 * Sanntidspriser (poll) via egen API-rute → Binance.
 * Krever ikke innlogging; unngår CORS og feil encoding mot Binance.
 */
export function useRealtimePrices(
  symbols: string[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
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
      console.error("Error fetching prices:", err);
      try {
        const binanceData = await fetchBinancePricesDirect(
          symbolsKey.split(","),
        );
        setCoins(binanceData);
        setSource("binance-direct");
        setError(null);
      } catch {
        setError("Kunne ikke hente priser");
      }
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

/** Nødfallback fra klienten hvis API-ruten feiler (f.eks. midlertidig 502) */
async function fetchBinancePricesDirect(
  symbols: string[],
): Promise<CoinPrice[]> {
  const upper = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (upper.length === 0) return [];

  if (upper.length === 1) {
    const symbol = upper[0]!;
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Binance single ticker failed");
    const data = (await res.json()) as {
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
    };
    return [
      {
        symbol: data.symbol,
        name: COIN_NAMES[symbol] || symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        lastUpdated: new Date(),
      },
    ];
  }

  const encoded = encodeURIComponent(JSON.stringify(upper));
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${encoded}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Binance batch ticker failed");
  const tickers = (await res.json()) as Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
  }>;

  return upper.map((symbol) => {
    const t = tickers.find((x) => x.symbol === symbol);
    return {
      symbol,
      name: COIN_NAMES[symbol] || symbol,
      price: t ? parseFloat(t.lastPrice) : 0,
      change24h: t ? parseFloat(t.priceChangePercent) : 0,
      lastUpdated: new Date(),
    };
  });
}
