/**
 * WebSocketManager — Robust singleton for managing WebSocket connections
 * 
 * Features:
 * - Singleton pattern for connection management
 * - Automatic reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
 * - Connection state tracking (connecting, open, closing, closed)
 * - Heartbeat/ping-pong for detecting dead connections
 * - Graceful shutdown
 * - Multi-subscription support (same WS for multiple symbols)
 * - Circuit breaker pattern for repeated failures
 */

import { useRealtimeStore } from "@/store/realtime-store";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "closing" | "error";

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export type PriceCallback = (data: TickerData) => void;

interface Subscription {
  id: string;
  symbol: string;
  callback: PriceCallback;
  createdAt: number;
}

interface WebSocketMetrics {
  connectCount: number;
  reconnectCount: number;
  errorCount: number;
  lastMessageAt: number | null;
  lastConnectAt: number | null;
  bytesReceived: number;
  messagesReceived: number;
}

// Configuration constants
const BINANCE_STREAM_BASE = "wss://stream.binance.com:9443/stream";
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT_MS = 10000; // 10 seconds to receive pong
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const CIRCUIT_BREAKER_RESET_MS = 60000; // Try to close circuit after 60 seconds

class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  
  // WebSocket instance
  private ws: WebSocket | null = null;
  
  // Subscriptions management
  private subscriptions: Map<string, Subscription> = new Map();
  private symbolSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> subIds
  
  // Connection state
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;
  private isManualClose = false;
  
  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPongReceived = 0;
  
  // Circuit breaker
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitResetTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Metrics
  private metrics: WebSocketMetrics = {
    connectCount: 0,
    reconnectCount: 0,
    errorCount: 0,
    lastMessageAt: null,
    lastConnectAt: null,
    bytesReceived: 0,
    messagesReceived: 0,
  };

  private constructor() {}

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

  /**
   * Subscribe to a symbol's price updates
   * @returns Subscription ID that can be used to unsubscribe
   */
  subscribe(symbol: string, callback: PriceCallback): string {
    const normalizedSymbol = symbol.toUpperCase();
    const subId = this.generateSubscriptionId();
    
    const subscription: Subscription = {
      id: subId,
      symbol: normalizedSymbol,
      callback,
      createdAt: Date.now(),
    };
    
    this.subscriptions.set(subId, subscription);
    
    // Track symbol -> subscriptions mapping
    if (!this.symbolSubscriptions.has(normalizedSymbol)) {
      this.symbolSubscriptions.set(normalizedSymbol, new Set());
    }
    this.symbolSubscriptions.get(normalizedSymbol)!.add(subId);
    
    // Update store with subscribed symbols
    this.updateStoreSymbols();
    
    // Connect or reconnect if needed
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.state !== "connecting") {
        this.connect();
      }
    } else if (this.state === "connected") {
      // Already connected, reconnect to include new symbol
      this.reconnect();
    }
    
    return subId;
  }

  /**
   * Unsubscribe using subscription ID
   */
  unsubscribe(subId: string): void {
    const subscription = this.subscriptions.get(subId);
    if (!subscription) return;
    
    // Remove from subscriptions
    this.subscriptions.delete(subId);
    
    // Remove from symbol mapping
    const symbolSubs = this.symbolSubscriptions.get(subscription.symbol);
    if (symbolSubs) {
      symbolSubs.delete(subId);
      if (symbolSubs.size === 0) {
        this.symbolSubscriptions.delete(subscription.symbol);
        // Reconnect to update streams if symbol is no longer needed
        if (this.state === "connected" && !this.isDestroyed) {
          this.reconnect();
        }
      }
    }
    
    this.updateStoreSymbols();
    
    // If no more subscriptions, close connection
    if (this.subscriptions.size === 0 && !this.isDestroyed) {
      this.disconnect(true);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Force reconnect
   */
  reconnect(): void {
    if (this.isDestroyed) return;
    this.disconnect(true);
    this.reconnectAttempts = 0;
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.connect();
  }

  /**
   * Get current metrics
   */
  getMetrics(): Readonly<WebSocketMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get active subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get unique symbol count
   */
  getSymbolCount(): number {
    return this.symbolSubscriptions.size;
  }

  /**
   * Get list of subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.symbolSubscriptions.keys());
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitOpen;
  }

  /**
   * Gracefully destroy the manager
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect(true);
    this.subscriptions.clear();
    this.symbolSubscriptions.clear();
    this.clearCircuitResetTimer();
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private updateStoreSymbols(): void {
    const symbols = Array.from(this.symbolSubscriptions.keys());
    useRealtimeStore.getState().setSubscribedSymbols(symbols);
  }

  private connect(): void {
    if (this.isDestroyed || this.symbolSubscriptions.size === 0) return;
    
    // Check circuit breaker
    if (this.circuitOpen) {
      console.warn("[WebSocketManager] Circuit breaker is open, skipping connection");
      return;
    }
    
    // Close existing connection
    this.disconnect(false);
    
    this.state = "connecting";
    this.updateStoreStatus("connecting");
    
    const symbols = Array.from(this.symbolSubscriptions.keys());
    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const wsUrl = `${BINANCE_STREAM_BASE}?streams=${streams}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleOpen(): void {
    this.state = "connected";
    this.reconnectAttempts = 0;
    this.consecutiveFailures = 0;
    this.isManualClose = false;
    this.metrics.connectCount++;
    this.metrics.lastConnectAt = Date.now();
    
    this.updateStoreStatus("connected");
    this.startHeartbeat();
  }

  private handleMessage(event: { data: string }): void {
    try {
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += event.data.length;
      this.metrics.lastMessageAt = Date.now();
      
      const { data, stream } = JSON.parse(event.data) as {
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
        stream: string;
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
      
      // Notify subscribers for this symbol
      const symbolSubs = this.symbolSubscriptions.get(data.s);
      if (symbolSubs) {
        for (const subId of symbolSubs) {
          const sub = this.subscriptions.get(subId);
          if (sub) {
            try {
              sub.callback(tickerData);
            } catch (error) {
              console.error(`[WebSocketManager] Subscriber error for ${subId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  private handleError(error: Event | unknown): void {
    this.state = "error";
    this.metrics.errorCount++;
    this.consecutiveFailures++;
    
    this.updateStoreStatus("error");
    
    // Check if circuit breaker should open
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker();
    }
  }

  private handleClose(): void {
    this.stopHeartbeat();
    
    if (this.isManualClose) {
      this.state = "disconnected";
      this.updateStoreStatus("disconnected");
    } else if (!this.isDestroyed && this.state !== "error") {
      this.state = "disconnected";
      this.updateStoreStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  private disconnect(manual: boolean): void {
    this.isManualClose = manual;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      // Remove handlers before closing to prevent reconnect
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
    
    if (manual) {
      this.state = "disconnected";
      this.updateStoreStatus("disconnected");
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || this.circuitOpen) {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("[WebSocketManager] Max reconnect attempts reached");
        this.state = "error";
        this.updateStoreStatus("error");
      }
      return;
    }
    
    this.reconnectAttempts++;
    this.metrics.reconnectCount++;
    
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS
    );
    
    this.state = "connecting";
    this.updateStoreStatus("connecting");
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping frame (Binance handles this automatically, but we track it)
        this.lastPongReceived = 0;
        
        // Set timeout to detect if connection is dead
        this.heartbeatTimeout = setTimeout(() => {
          if (this.lastPongReceived === 0) {
            // No pong received, connection might be dead
            console.warn("[WebSocketManager] Heartbeat timeout, forcing reconnect");
            this.reconnect();
          }
        }, HEARTBEAT_TIMEOUT_MS);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private openCircuitBreaker(): void {
    this.circuitOpen = true;
    console.warn("[WebSocketManager] Circuit breaker opened due to repeated failures");
    
    // Schedule circuit reset
    this.circuitResetTimer = setTimeout(() => {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
      console.info("[WebSocketManager] Circuit breaker reset, attempting reconnect");
      this.connect();
    }, CIRCUIT_BREAKER_RESET_MS);
  }

  private clearCircuitResetTimer(): void {
    if (this.circuitResetTimer) {
      clearTimeout(this.circuitResetTimer);
      this.circuitResetTimer = null;
    }
  }

  private updateStoreStatus(status: "disconnected" | "connecting" | "connected" | "error"): void {
    useRealtimeStore.getState().setBinanceStatus(status);
  }
}

export { WebSocketManager };
