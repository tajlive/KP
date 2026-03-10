"use client";

import { PriceWebSocket } from "@/lib/auto-trading/binance-websocket";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

// Local type definition since coin_prices may not be in generated schema
interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  price_change_24h: number | null;
  price_change_percent_24h: number | null;
  volume_24h: number | null;
  market_cap: number | null;
  high_24h: number | null;
  low_24h: number | null;
  last_updated: string | null;
  created_at: string;
}

// KLA-105: Priority symbols for real-time WebSocket updates
const PRIORITY_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "DOGEUSDT",
];

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const fetchPrices = async () => {
      setLoading(true);
      // Using type assertion since coin_prices table may vary by environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("coin_prices").select("*");

      const priceMap = ((data || []) as CoinPrice[]).reduce(
        (acc: Record<string, CoinPrice>, price: unknown) => {
          acc[price.symbol] = price as CoinPrice;
          return acc;
        },
        {} as Record<string, CoinPrice>,
      );

      setPrices(priceMap);
      setIsConnected(true);
      setLoading(false);
    };

    fetchPrices();

    // 1. Supabase Real-time subscription (Backup/Other symbols)
    const channel = supabase
      .channel("prices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coin_prices" },
        fetchPrices,
      )
      .subscribe((status) => {
        setIsConnected((prev) => {
          const next = status === "SUBSCRIBED";
          return prev === next ? prev : next;
        });
      });

    // 2. Binance WebSocket for Priority Symbols (Active UI)
    const ws = new PriceWebSocket(PRIORITY_SYMBOLS, (updatedPrices) => {
      setPrices((prev) => {
        const next = { ...prev };
        Object.entries(updatedPrices).forEach(([symbol, price]) => {
          if (next[symbol]) {
            next[symbol] = { ...next[symbol], price };
          } else {
            // Create minimal entry if missing
            next[symbol] = {
              symbol,
              price,
              created_at: new Date().toISOString(),
              id: "", // Placeholder
              name: symbol.replace("USDT", ""),
              price_change_24h: 0,
              price_change_percent_24h: 0,
              volume_24h: 0,
              market_cap: 0,
              high_24h: 0,
              low_24h: 0,
              last_updated: new Date().toISOString(),
            } as unknown as CoinPrice;
          }
        });
        return next;
      });
    });

    ws.connect();

    return () => {
      supabase.removeChannel(channel);
      ws.disconnect();
    };
  }, []); // Empty deps - singleton client is stable

  return { prices, loading, isConnected };
}

export function useAnimatedPrice(symbol: string) {
  const { prices, isConnected } = usePrices();
  const priceData = prices[symbol];

  return {
    price: priceData?.price || 0,
    formattedPrice:
      priceData?.price?.toLocaleString("no-NO", {
        style: "currency",
        currency: "USD",
      }) || "$0.00",
    priceDirection:
      priceData?.price_change_24h && priceData.price_change_24h >= 0
        ? "up"
        : "down",
    priceChange24h: priceData?.price_change_percent_24h || 0,
    isConnected,
  };
}
