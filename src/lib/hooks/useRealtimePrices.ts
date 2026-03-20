"use client";

import { createClient } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

export interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  lastUpdated: Date;
}

const COIN_NAMES: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  SOLUSDT: "Solana",
  BNBUSDT: "BNB",
  ADAUSDT: "Cardano",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
};

/**
 * Hook for å hente sanntidspriser fra Binance via Supabase Edge Function
 */
export function useRealtimePrices(
  symbols: string[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
) {
  const [coins, setCoins] = useState<CoinPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize symbols dependency
  const symbolsKey = symbols.join(",");

  const fetchPrices = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Ikke autentisert");
        setLoading(false);
        return;
      }

      // Kall Edge Function direkte via Supabase-klienten (raskere og sikrere)
      const { data, error: invokeError } = await supabase.functions.invoke(
        `get-binance-prices?symbols=${symbolsKey}`,
        {
          method: "GET",
        },
      );

      if (invokeError) {
        throw invokeError;
      }

      const prices = data?.prices || [];

      const formattedCoins: CoinPrice[] = symbolsKey
        .split(",")
        .map((symbol) => {
          const priceData = prices.find(
            (p: unknown) =>
              (p as { symbol?: string }).symbol === symbol.toUpperCase(),
          ) || { price: 0, change24h: 0 };
          return {
            symbol,
            name: COIN_NAMES[symbol] || symbol,
            price: priceData.price || 0,
            change24h: priceData.change24h || 0,
            lastUpdated: new Date(),
          };
        });

      setCoins(formattedCoins);
      setError(null);
    } catch (err) {
      console.error("Error fetching prices:", err);
      // Fallback til Binance API
      try {
        const binanceData = await fetchBinancePrices(symbolsKey.split(","));
        setCoins(binanceData);
        setError(null);
      } catch {
        setError("Kunne ikke hente priser");
      }
    } finally {
      setLoading(false);
    }
  }, [symbolsKey]);

  // Hent priser ved mount og hvert 10. sekund
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { coins, loading, error, refresh: fetchPrices };
}

/**
 * Fallback: Hent priser direkte fra Binance public API
 */
async function fetchBinancePrices(symbols: string[]): Promise<CoinPrice[]> {
  const responses = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
          symbol,
          name: COIN_NAMES[symbol] || symbol,
          price: parseFloat(data.lastPrice) * 11.5, // Konverter til NOK (ca. kurs)
          change24h: parseFloat(data.priceChangePercent),
          lastUpdated: new Date(),
        };
      } catch {
        return null;
      }
    }),
  );

  return responses.filter((c): c is CoinPrice => c !== null);
}
