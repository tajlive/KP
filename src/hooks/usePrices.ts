"use client";

/**
 * @deprecated Use useWebSocketPrice or useWebSocketPrices from @/hooks/useWebSocketPrice for new code.
 * This hook is kept for backwards compatibility.
 * 
 * Migration:
 *   - usePrices() → useWebSocketPrices(PRIORITY_SYMBOLS)
 *   - useAnimatedPrice(symbol) → useWebSocketPrice(symbol)
 */

import { WebSocketManager } from "@/lib/websocket/WebSocketManager";
import { getDisplayUsdtToNokRate, usdtPriceToNok } from "@/lib/market/nok";

// KLA-fx: normaliser med SANNTIDS USDT/NOK-rate (/api/fx/usdt-nok).
// Statisk build-time fallback (10.92) gir ~14% feil priser.
let liveUsdtNokRate: number | null = null;
let rateFetchStarted = false;
function getLiveUsdtNokRate(): number {
  if (!rateFetchStarted && typeof window !== "undefined") {
    rateFetchStarted = true;
    fetch("/api/fx/usdt-nok")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.rate === "number" && d.rate > 0) liveUsdtNokRate = d.rate;
      })
      .catch(() => {});
  }
  return liveUsdtNokRate ?? getDisplayUsdtToNokRate();
}
import { getSupabaseClient } from "@/lib/supabase/client";
import { PAPER_TRADING_UI_SYMBOLS } from "@/lib/trading/paper-ui-symbols";
import { RealtimeChannel } from "@supabase/realtime-js";
import { useEffect, useState, useRef } from "react";

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
// Uses canonical UI symbols so all tradable assets get WebSocket prices
const PRIORITY_SYMBOLS = [...PAPER_TRADING_UI_SYMBOLS];

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const fetchPrices = async () => {
      setLoading(true);
      // Using local adapter: table exists in remote schema but can drift in local generated types.
      const { data } = await supabase.from("coin_prices").select("*");

      const priceMap = ((data || []) as unknown as CoinPrice[]).reduce(
        (acc: Record<string, CoinPrice>, price) => {
          acc[price.symbol] = price;
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
    const channelName = `prices-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
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

    // 2. Kraken WebSocket for Priority Symbols (Active UI)
    const callback = (
      updatedPrices: Record<string, { price: number; changePercent24h?: number }>,
    ) => {
      setPrices((prev) => {
        const next = { ...prev };
        Object.entries(updatedPrices).forEach(([symbol, tick]) => {
          // Kraken WebSocket gir USDT-priser, mens coin_prices i DB er NOK.
          // Normaliser alltid til NOK før state oppdateres.
          const priceNok = usdtPriceToNok(tick.price, getLiveUsdtNokRate());
          const changePatch =
            typeof tick.changePercent24h === "number"
              ? { price_change_percent_24h: tick.changePercent24h }
              : {};
          if (next[symbol]) {
            next[symbol] = { ...next[symbol], price: priceNok, ...changePatch };
          } else {
            // Create minimal entry if missing
            next[symbol] = {
              symbol,
              price: priceNok,
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
    };

    // EU/EØS (2026): Kraken WS (WebSocketManager) — eneste tallkilde
    const unsubscribe = WebSocketManager.getInstance().subscribeToTickers(
      PRIORITY_SYMBOLS,
      (ticker) => {
        callback({
          [ticker.symbol]: {
            price: ticker.price,
            changePercent24h: ticker.changePercent24h,
          },
        });
      },
    );

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      unsubscribe();
    };
  }, []); // Empty deps - singleton client is stable

  return { prices, loading, isConnected };
}

export function useAnimatedPrice(symbol: string) {
  const { prices, isConnected } = usePrices();
  const priceData = prices[symbol];

  return {
    price: priceData?.price || 0,
    // Pris i state er NOK (normalisert i usePrices) — ikke USD.
    formattedPrice:
      priceData?.price?.toLocaleString("no-NO", {
        style: "currency",
        currency: "NOK",
      }) || "0 kr",
    priceDirection:
      priceData?.price_change_24h && priceData.price_change_24h >= 0
        ? "up"
        : "down",
    priceChange24h: priceData?.price_change_percent_24h || 0,
    isConnected,
  };
}
