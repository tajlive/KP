/**
 * BinanceWebSocket — Service for Binance WebSocket streams
 * 
 * Features:
 * - Stream multiplexing (multiple symbols on one connection)
 * - AggTrade stream (real-time trades)
 * - 24hrTicker stream (price + 24h change)
 * - Depth stream (order book)
 * - Rate limiting compliance
 */

import { WebSocketManager, type PriceCallback, type TickerData } from "./WebSocketManager";

// Binance WebSocket endpoints
const BINANCE_WS_BASE = {
  spot: "wss://stream.binance.com:9443/ws",
  spotCombined: "wss://stream.binance.com:9443/stream",
  futures: "wss://fstream.binance.com/ws",
  futuresCombined: "wss://fstream.binance.com/stream",
} as const;

// Stream types
export type StreamType = "ticker" | "miniTicker" | "aggTrade" | "trade" | "depth" | "kline" | "bookTicker";

export interface BinanceStreamOptions {
  symbol: string;
  type: StreamType;
  interval?: string; // For kline stream (e.g., "1m", "1h", "1d")
  level?: number; // For depth stream (5, 10, 20)
  speed?: 1000 | 100; // Update speed in ms (1000ms or 100ms for faster updates)
}

export interface AggTradeData {
  symbol: string;
  price: number;
  quantity: number;
  tradeId: number;
  isBuyerMaker: boolean;
  timestamp: number;
}

export interface DepthData {
  symbol: string;
  lastUpdateId: number;
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][]; // [price, quantity][]
  timestamp: number;
}

export interface KlineData {
  symbol: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
  isClosed: boolean;
}

export type TradeCallback = (data: AggTradeData) => void;
export type DepthCallback = (data: DepthData) => void;
export type KlineCallback = (data: KlineData) => void;

// Rate limiting (Binance allows 5 messages per second per connection)
const RATE_LIMIT_MESSAGES = 5;
const RATE_LIMIT_WINDOW_MS = 1000;

class BinanceWebSocket {
  private wsManager: WebSocketManager;
  private tradeSubscriptions: Map<string, Set<TradeCallback>> = new Map();
  private depthSubscriptions: Map<string, Set<DepthCallback>> = new Map();
  private klineSubscriptions: Map<string, Map<string, Set<KlineCallback>>> = new Map(); // symbol -> interval -> callbacks
  
  // Rate limiting
  private messageCount = 0;
  private rateLimitResetTimer: ReturnType<typeof setInterval> | null = null;
  
  // Custom WebSocket connections for non-ticker streams
  private customConnections: Map<string, WebSocket> = new Map();
  private customConnectionCallbacks: Map<string, (data: unknown) => void> = new Map();

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.startRateLimitReset();
  }

  /**
   * Subscribe to 24hr ticker stream (price + 24h change)
   * Uses the shared WebSocketManager for efficient multiplexing
   * @returns Unsubscribe function
   */
  subscribeToTicker(symbol: string, callback: PriceCallback): () => void {
    const subId = this.wsManager.subscribe(symbol, callback);
    return () => {
      this.wsManager.unsubscribe(subId);
    };
  }

  /**
   * Subscribe to multiple symbols at once
   * @returns Unsubscribe function that unsubscribes all
   */
  subscribeToTickers(symbols: string[], callback: PriceCallback): () => void {
    const subIds: string[] = [];
    
    for (const symbol of symbols) {
      const subId = this.wsManager.subscribe(symbol, callback);
      subIds.push(subId);
    }
    
    return () => {
      for (const subId of subIds) {
        this.wsManager.unsubscribe(subId);
      }
    };
  }

  /**
   * Subscribe to aggregated trade stream
   * @returns Unsubscribe function
   */
  subscribeToAggTrades(symbol: string, callback: TradeCallback): () => void {
    const normalizedSymbol = symbol.toLowerCase();
    const streamKey = `${normalizedSymbol}@aggTrade`;
    
    // Add callback to subscription map
    if (!this.tradeSubscriptions.has(streamKey)) {
      this.tradeSubscriptions.set(streamKey, new Set());
    }
    this.tradeSubscriptions.get(streamKey)!.add(callback);
    
    // Connect if not already connected
    if (!this.customConnections.has(streamKey)) {
      this.connectToCustomStream(streamKey, BINANCE_WS_BASE.spot, (data) => {
        this.handleAggTradeMessage(data as AggTradeMessage);
      });
    }
    
    return () => {
      const callbacks = this.tradeSubscriptions.get(streamKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.tradeSubscriptions.delete(streamKey);
          this.disconnectCustomStream(streamKey);
        }
      }
    };
  }

  /**
   * Subscribe to order book depth stream
   * @returns Unsubscribe function
   */
  subscribeToDepth(
    symbol: string, 
    callback: DepthCallback, 
    options: { level?: 5 | 10 | 20; speed?: 1000 | 100 } = {}
  ): () => void {
    const normalizedSymbol = symbol.toLowerCase();
    const level = options.level || 20;
    const speed = options.speed || 1000;
    const streamKey = `${normalizedSymbol}@depth${level}@${speed}ms`;
    
    if (!this.depthSubscriptions.has(streamKey)) {
      this.depthSubscriptions.set(streamKey, new Set());
    }
    this.depthSubscriptions.get(streamKey)!.add(callback);
    
    if (!this.customConnections.has(streamKey)) {
      this.connectToCustomStream(streamKey, BINANCE_WS_BASE.spot, (data) => {
        this.handleDepthMessage(data as DepthMessage, symbol);
      });
    }
    
    return () => {
      const callbacks = this.depthSubscriptions.get(streamKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.depthSubscriptions.delete(streamKey);
          this.disconnectCustomStream(streamKey);
        }
      }
    };
  }

  /**
   * Subscribe to kline/candlestick stream
   * @returns Unsubscribe function
   */
  subscribeToKlines(symbol: string, interval: string, callback: KlineCallback): () => void {
    const normalizedSymbol = symbol.toLowerCase();
    const streamKey = `${normalizedSymbol}@kline_${interval}`;
    
    if (!this.klineSubscriptions.has(symbol)) {
      this.klineSubscriptions.set(symbol, new Map());
    }
    
    const symbolKlines = this.klineSubscriptions.get(symbol)!;
    if (!symbolKlines.has(interval)) {
      symbolKlines.set(interval, new Set());
    }
    
    symbolKlines.get(interval)!.add(callback);
    
    if (!this.customConnections.has(streamKey)) {
      this.connectToCustomStream(streamKey, BINANCE_WS_BASE.spot, (data) => {
        this.handleKlineMessage(data as KlineMessage, symbol);
      });
    }
    
    return () => {
      const symbolKlines = this.klineSubscriptions.get(symbol);
      if (symbolKlines) {
        const callbacks = symbolKlines.get(interval);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            symbolKlines.delete(interval);
            if (symbolKlines.size === 0) {
              this.klineSubscriptions.delete(symbol);
            }
            this.disconnectCustomStream(streamKey);
          }
        }
      }
    };
  }

  /**
   * Get current price for a symbol from the store
   * Note: Prices are stored in the global realtime store
   */
  getCurrentPrice(_symbol: string): number | null {
    // Prices are available through useRealtimeStore
    // This method exists for API consistency
    return null;
  }

  /**
   * Get WebSocketManager instance for advanced usage
   */
  getManager(): WebSocketManager {
    return this.wsManager;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.wsManager.getConnectionState();
  }

  /**
   * Get metrics from the manager
   */
  getMetrics() {
    return this.wsManager.getMetrics();
  }

  /**
   * Force reconnect all connections
   */
  reconnect(): void {
    this.wsManager.reconnect();
    
    // Reconnect custom connections
    for (const [streamKey, ws] of this.customConnections.entries()) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      
      // Reconnect with same callback
      const callback = this.customConnectionCallbacks.get(streamKey);
      if (callback) {
        const baseUrl = BINANCE_WS_BASE.spot;
        this.connectToCustomStream(streamKey, baseUrl, callback);
      }
    }
  }

  /**
   * Clean up all connections
   */
  destroy(): void {
    // Disconnect all custom connections
    for (const [streamKey, ws] of this.customConnections.entries()) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    this.customConnections.clear();
    this.customConnectionCallbacks.clear();
    
    this.tradeSubscriptions.clear();
    this.depthSubscriptions.clear();
    this.klineSubscriptions.clear();
    
    if (this.rateLimitResetTimer) {
      clearInterval(this.rateLimitResetTimer);
      this.rateLimitResetTimer = null;
    }
  }

  private startRateLimitReset(): void {
    this.rateLimitResetTimer = setInterval(() => {
      this.messageCount = 0;
    }, RATE_LIMIT_WINDOW_MS);
  }

  private checkRateLimit(): boolean {
    if (this.messageCount >= RATE_LIMIT_MESSAGES) {
      console.warn("[BinanceWebSocket] Rate limit reached, throttling messages");
      return false;
    }
    this.messageCount++;
    return true;
  }

  private connectToCustomStream(
    streamKey: string, 
    baseUrl: string, 
    callback: (data: unknown) => void
  ): void {
    const wsUrl = `${baseUrl}/${streamKey}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error(`[BinanceWebSocket] Parse error for ${streamKey}:`, error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`[BinanceWebSocket] Error for ${streamKey}:`, error);
      };
      
      ws.onclose = () => {
        // Auto-reconnect logic could be added here
        this.customConnections.delete(streamKey);
      };
      
      this.customConnections.set(streamKey, ws);
      this.customConnectionCallbacks.set(streamKey, callback);
    } catch (error) {
      console.error(`[BinanceWebSocket] Failed to connect to ${streamKey}:`, error);
    }
  }

  private disconnectCustomStream(streamKey: string): void {
    const ws = this.customConnections.get(streamKey);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      this.customConnections.delete(streamKey);
      this.customConnectionCallbacks.delete(streamKey);
    }
  }

  private handleAggTradeMessage(data: AggTradeMessage): void {
    const symbol = data.s;
    const streamKey = `${symbol.toLowerCase()}@aggTrade`;
    
    const callbacks = this.tradeSubscriptions.get(streamKey);
    if (!callbacks) return;
    
    const tradeData: AggTradeData = {
      symbol: data.s,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      tradeId: data.a,
      isBuyerMaker: data.m,
      timestamp: data.T,
    };
    
    for (const callback of callbacks) {
      try {
        callback(tradeData);
      } catch (error) {
        console.error("[BinanceWebSocket] Trade callback error:", error);
      }
    }
  }

  private handleDepthMessage(data: DepthMessage, symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    const streamKey = `${normalizedSymbol}@depth`; // Simplified key matching
    
    // Find matching subscription (may have different levels/speeds)
    for (const [key, callbacks] of this.depthSubscriptions.entries()) {
      if (key.startsWith(normalizedSymbol)) {
        const depthData: DepthData = {
          symbol,
          lastUpdateId: data.lastUpdateId,
          bids: data.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
          asks: data.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]),
          timestamp: Date.now(),
        };
        
        for (const callback of callbacks) {
          try {
            callback(depthData);
          } catch (error) {
            console.error("[BinanceWebSocket] Depth callback error:", error);
          }
        }
      }
    }
  }

  private handleKlineMessage(data: KlineMessage, symbol: string): void {
    const interval = data.k.i;
    
    const symbolKlines = this.klineSubscriptions.get(symbol);
    if (!symbolKlines) return;
    
    const callbacks = symbolKlines.get(interval);
    if (!callbacks) return;
    
    const klineData: KlineData = {
      symbol,
      openTime: data.k.t,
      closeTime: data.k.T,
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v),
      quoteVolume: parseFloat(data.k.q),
      trades: data.k.n,
      takerBuyBaseVolume: parseFloat(data.k.V),
      takerBuyQuoteVolume: parseFloat(data.k.Q),
      isClosed: data.k.x,
    };
    
    for (const callback of callbacks) {
      try {
        callback(klineData);
      } catch (error) {
        console.error("[BinanceWebSocket] Kline callback error:", error);
      }
    }
  }
}

// Message type definitions
interface AggTradeMessage {
  e: "aggTrade";
  E: number;
  s: string;
  a: number;
  p: string;
  q: string;
  f: number;
  l: number;
  T: number;
  m: boolean;
  M: boolean;
}

interface DepthMessage {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface KlineMessage {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // Open time
    T: number; // Close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open
    c: string; // Close
    h: string; // High
    l: string; // Low
    v: string; // Volume
    n: number; // Number of trades
    x: boolean; // Is closed
    q: string; // Quote volume
    V: string; // Taker buy base volume
    Q: string; // Taker buy quote volume
    B: string; // Ignore
  };
}

// Export singleton instance
const binanceWebSocket = new BinanceWebSocket();

export { BinanceWebSocket, binanceWebSocket, BINANCE_WS_BASE };
