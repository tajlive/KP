/**
 * WebSocket Manager — singleton for managing Binance WS connections
 * Handles multi-symbol price streams with auto-reconnect and exponential backoff.
 */

import { useRealtimeStore } from "@/store/realtime-store";

const BINANCE_STREAM_BASE = "wss://stream.binance.com:9443/stream";
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

type PriceCallback = (symbol: string, price: number, data: TickerData) => void;

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private symbols: Set<string> = new Set();
  private callbacks: Set<PriceCallback> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  static resetInstance(): void {
    if (WebSocketManager.instance) {
      WebSocketManager.instance.destroy();
      WebSocketManager.instance = null;
    }
  }

  subscribe(symbols: string[], callback: PriceCallback): () => void {
    const newSymbols: string[] = [];

    for (const s of symbols) {
      const upper = s.toUpperCase();
      if (!this.symbols.has(upper)) {
        newSymbols.push(upper);
        this.symbols.add(upper);
      }
    }

    this.callbacks.add(callback);

    // Reconnect with updated symbol list if we added new ones
    if (newSymbols.length > 0) {
      this.reconnect();
    } else if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      // Don't remove symbols — other subscribers may need them
    };
  }

  private connect(): void {
    if (this.isDestroyed || this.symbols.size === 0) return;

    // Close existing connection
    this.closeQuietly();

    const store = useRealtimeStore.getState();
    store.setBinanceStatus("connecting");
    store.setSubscribedSymbols(Array.from(this.symbols));

    const streams = Array.from(this.symbols)
      .map((s) => `${s.toLowerCase()}@ticker`)
      .join("/");

    const wsUrl = `${BINANCE_STREAM_BASE}?streams=${streams}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        useRealtimeStore.getState().setBinanceStatus("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const { data } = JSON.parse(event.data) as {
            data: {
              s: string; // Symbol
              c: string; // Close price
              p: string; // Price change
              P: string; // Price change percent
              h: string; // High
              l: string; // Low
              v: string; // Volume
              E: number; // Event time
            };
          };

          const tickerData: TickerData = {
            symbol: data.s,
            price: parseFloat(data.c),
            change24h: parseFloat(data.p),
            changePercent24h: parseFloat(data.P),
            high24h: parseFloat(data.h),
            low24h: parseFloat(data.l),
            volume24h: parseFloat(data.v),
            timestamp: data.E,
          };

          // Update global store
          useRealtimeStore.getState().updatePrice(data.s, {
            price: tickerData.price,
            change24h: tickerData.changePercent24h,
            volume24h: tickerData.volume24h,
            high24h: tickerData.high24h,
            low24h: tickerData.low24h,
          });

          // Notify all subscribers
          for (const cb of this.callbacks) {
            try {
              cb(data.s, tickerData.price, tickerData);
            } catch {
              // Ignore subscriber errors
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        useRealtimeStore.getState().setBinanceStatus("error");
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed) {
          useRealtimeStore.getState().setBinanceStatus("disconnected");
          this.attemptReconnect();
        }
      };
    } catch {
      useRealtimeStore.getState().setBinanceStatus("error");
      this.attemptReconnect();
    }
  }

  private reconnect(): void {
    this.closeQuietly();
    this.reconnectAttempts = 0;
    this.connect();
  }

  private attemptReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      useRealtimeStore.getState().setBinanceStatus("error");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private closeQuietly(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.closeQuietly();
    this.symbols.clear();
    this.callbacks.clear();
    useRealtimeStore.getState().setBinanceStatus("disconnected");
  }

  get connectionState(): "disconnected" | "connecting" | "connected" | "error" {
    return useRealtimeStore.getState().binanceStatus;
  }
}

export { WebSocketManager };
export type { PriceCallback, TickerData };
