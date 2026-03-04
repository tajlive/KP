"use client";

/**
 * useLivePrices — subscribe to real-time Binance price updates
 * Uses the singleton WebSocketManager + PriceAggregator with REST fallback.
 */

import { PriceAggregator } from "@/lib/realtime/price-aggregator";
import { useRealtimeStore } from "@/store/realtime-store";
import { useCallback, useEffect, useMemo } from "react";

interface LivePriceData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

interface UseLivePricesReturn {
  prices: Record<string, LivePriceData>;
  isConnected: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  getPrice: (symbol: string) => number | null;
}

export function useLivePrices(symbols: string[]): UseLivePricesReturn {
  const priceCache = useRealtimeStore((s) => s.priceCache);
  const binanceStatus = useRealtimeStore((s) => s.binanceStatus);
  const getPrice = useRealtimeStore((s) => s.getPrice);

  // Stable symbol key for effect dependency
  const symbolKey = useMemo(() => symbols.sort().join(","), [symbols]);

  useEffect(() => {
    if (!symbolKey) return;

    const syms = symbolKey.split(",").filter(Boolean);
    const aggregator = new PriceAggregator({
      symbols: syms,
      enableRestFallback: true,
    });

    aggregator.start();

    return () => {
      aggregator.stop();
    };
  }, [symbolKey]);

  // Extract only the prices for requested symbols
  const prices = useMemo(() => {
    const result: Record<string, LivePriceData> = {};
    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const cached = priceCache[upper];
      if (cached) {
        result[upper] = cached;
      }
    }
    return result;
  }, [symbols, priceCache]);

  const getPriceFn = useCallback(
    (symbol: string) => getPrice(symbol.toUpperCase()),
    [getPrice],
  );

  return {
    prices,
    isConnected: binanceStatus === "connected",
    connectionStatus: binanceStatus,
    getPrice: getPriceFn,
  };
}

/** Convenience hook for a single symbol */
export function useLivePrice(symbol: string) {
  const { prices, isConnected, connectionStatus } = useLivePrices([symbol]);
  const upper = symbol.toUpperCase();
  const data = prices[upper];

  return {
    price: data?.price ?? 0,
    change24h: data?.change24h ?? 0,
    volume24h: data?.volume24h ?? 0,
    high24h: data?.high24h ?? 0,
    low24h: data?.low24h ?? 0,
    isConnected,
    connectionStatus,
    isFresh: data ? Date.now() - data.timestamp < 30_000 : false,
  };
}
