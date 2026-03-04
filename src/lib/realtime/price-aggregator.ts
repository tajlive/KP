/**
 * Price Aggregator — combines Binance WS (primary) with REST polling (fallback).
 * Ensures prices are always available even when WebSocket is disconnected.
 */

import { useRealtimeStore } from "@/store/realtime-store";
import { WebSocketManager } from "./websocket-manager";

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
    // Subscribe to Binance WS via the singleton manager
    this.unsubscribeWs = this.wsManager.subscribe(
      this.symbols,
      (symbol, price) => {
        this.onPriceCallback?.(symbol, price);
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
      store.binanceStatus === "connected" &&
      store.lastPriceUpdate &&
      now - store.lastPriceUpdate < STALE_THRESHOLD
    ) {
      return;
    }

    try {
      const symbolParam = this.symbols.map((s) => `"${s}"`).join(",");
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolParam}]`,
        { cache: "no-store" },
      );

      if (!response.ok) return;

      const data = (await response.json()) as Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        highPrice: string;
        lowPrice: string;
        volume: string;
      }>;

      for (const ticker of data) {
        const price = parseFloat(ticker.lastPrice);
        store.updatePrice(ticker.symbol, {
          price,
          change24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.volume),
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
