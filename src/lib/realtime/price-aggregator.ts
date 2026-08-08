/**
 * Price Aggregator — combines Kraken WS (primary) with REST polling (fallback).
 * EU/EØS (2026): Kraken eneste tallkilde (Binance geo-blokkert).
 * Ensures prices are always available even when WebSocket is disconnected.
 */

import { useRealtimeStore } from "@/store/realtime-store";
import {
  WebSocketManager,
  type PriceCallback,
} from "@/lib/websocket/WebSocketManager";

const REST_POLL_INTERVAL = 10_000; // 10s fallback polling
const STALE_THRESHOLD = 30_000; // Consider data stale after 30s

interface PriceAggregatorOptions {
  symbols: string[];
  onPrice?: (symbol: string, price: number) => void;
  enableRestFallback?: boolean;
}

class PriceAggregator {
  private wsManager: WebSocketManager;
  private restInterval: ReturnType<typeof setInterval> | null = null;
  private symbols: string[];
  private unsubscribeWs: (() => void) | null = null;
  private onPriceCallback: ((symbol: string, price: number) => void) | null;
  private enableRestFallback: boolean;

  constructor(options: PriceAggregatorOptions) {
    this.wsManager = WebSocketManager.getInstance();
    this.symbols = options.symbols.map((s) => s.toUpperCase());
    this.onPriceCallback = options.onPrice ?? null;
    this.enableRestFallback = options.enableRestFallback ?? true;
  }

  start(): void {
    // Subscribe to Kraken WS via the singleton manager
    this.unsubscribeWs = this.wsManager.subscribeToTickers(
      this.symbols,
      (ticker: { symbol: string; price: number }) => {
        this.onPriceCallback?.(ticker.symbol, ticker.price);
      },
    );

    // Start REST fallback for when WS is down
    if (this.enableRestFallback) {
      this.startRestFallback();
    }
  }

  stop(): void {
    this.unsubscribeWs?.();
    this.unsubscribeWs = null;
    this.stopRestFallback();
  }

  private startRestFallback(): void {
    this.restInterval = setInterval(() => {
      this.pollIfStale();
    }, REST_POLL_INTERVAL);
  }

  private stopRestFallback(): void {
    if (this.restInterval) {
      clearInterval(this.restInterval);
      this.restInterval = null;
    }
  }

  private async pollIfStale(): Promise<void> {
    const store = useRealtimeStore.getState();
    const now = Date.now();

    // Only poll if WS is disconnected or data is stale
    if (
      store.krakenStatus === "connected" &&
      store.lastPriceUpdate &&
      now - store.lastPriceUpdate < STALE_THRESHOLD
    ) {
      return;
    }

    try {
      // EU/EØS (2026): via egen API-rute → Kraken (ingen direkte Binance-kall)
      const response = await fetch(
        `/api/market/binance-24hr?symbols=${encodeURIComponent(this.symbols.join(","))}`,
        { cache: "no-store" },
      );

      if (!response.ok) return;

      const body = (await response.json()) as {
        prices?: Array<{
          symbol: string;
          price: number;
          change24h: number;
        }>;
      };
      const data = body.prices ?? [];

      for (const ticker of data) {
        const price = Number(ticker.price);
        store.updatePrice(ticker.symbol, {
          price,
          change24h: Number(ticker.change24h),
        });
        this.onPriceCallback?.(ticker.symbol, price);
      }
    } catch {
      // Silent fail — REST is just a fallback
    }
  }

  /** Check if a symbol's price data is fresh */
  static isFresh(symbol: string): boolean {
    const entry = useRealtimeStore.getState().priceCache[symbol];
    if (!entry) return false;
    return Date.now() - entry.timestamp < STALE_THRESHOLD;
  }
}

export { PriceAggregator };
