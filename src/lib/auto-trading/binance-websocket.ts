/**
 * Binance WebSocket Integration for Auto-Trading
 * Real-time price updates, order execution updates, and account updates
 */

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/utils";
import type { BinanceTicker } from "@/types/database";

// WebSocket base URLs
const WS_BASE_URLS = {
  spot: "wss://stream.binance.com:9443/ws",
  futures: "wss://fstream.binance.com/ws",
};

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

interface OrderUpdate {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED";
  executedQty: number;
  totalQty: number;
  price: number;
  commission: number;
  commissionAsset: string;
}

interface ExecutionReportData {
  e: "executionReport";
  i: number;
  s: string;
  S: "BUY" | "SELL";
  X: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED";
  z: string;
  q: string;
  p: string;
  n?: string;
  N?: string;
}

interface AccountPositionData {
  e: "outboundAccountPosition";
  E: number;
  u: number;
  B: Array<{
    a: string;
    f: string;
    l: string;
  }>;
}

interface BalanceUpdateData {
  e: "balanceUpdate";
  E: number;
  a: string;
  d: string;
  T: number;
}

type WebSocketData =
  | ExecutionReportData
  | AccountPositionData
  | BalanceUpdateData
  | BinanceTicker;

/**
 * Manages WebSocket connections for auto-trading
 */
export class AutoTradingWebSocket {
  private ws: WebSocket | null = null;
  private userId: string;
  private listenKey: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onPriceUpdate: ((update: PriceUpdate) => void) | null = null;
  private onOrderUpdate: ((update: OrderUpdate) => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize WebSocket connection with user data stream
   */
  async connect(): Promise<boolean> {
    try {
      // Get listen key from Binance (requires API credentials)
      const listenKey = await this.getListenKey();
      if (!listenKey) {
        console.error("Failed to get listen key");
        return false;
      }

      this.listenKey = listenKey;

      // Connect to user data stream
      const wsUrl = `${WS_BASE_URLS.spot}/${listenKey}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.info("Auto-trading WebSocket connected");
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketData;
          this.handleMessage(data);
        } catch (error) {
          console.error("WebSocket message parse error:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.info("WebSocket closed");
        this.stopPingInterval();
        this.attemptReconnect();
      };

      return true;
    } catch (error) {
      console.error("WebSocket connection error:", error);
      return false;
    }
  }

  /**
   * Get listen key from Binance API
   */
  private async getListenKey(): Promise<string | null> {
    try {
      const supabase = createClient();

      // Call edge function to get listen key
      const { data, error } = await supabase.functions.invoke(
        "binance-get-listen-key",
        {
          body: { userId: this.userId },
        },
      );

      if (error || !data?.listenKey) {
        console.error("Failed to get listen key:", error);
        return null;
      }

      return data.listenKey;
    } catch (error) {
      console.error("Error getting listen key:", error);
      return null;
    }
  }

  /**
   * Keep listen key alive (must be called every 30-60 minutes)
   */
  private async keepAliveListenKey(): Promise<void> {
    if (!this.listenKey) return;

    try {
      const supabase = createClient();
      await supabase.functions.invoke("binance-keep-alive-listen-key", {
        body: {
          userId: this.userId,
          listenKey: this.listenKey,
        },
      });
    } catch (error) {
      console.error("Keep alive error:", error);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    // Clear any existing interval first (prevent duplicates)
    this.stopPingInterval();

    // Ping every 30 minutes to keep listen key alive
    this.pingInterval = setInterval(
      () => {
        // Only ping if WebSocket is still open
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.keepAliveListenKey();
        }
      },
      30 * 60 * 1000,
    );
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.info(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocketData): void {
    const eventType = data.e;

    switch (eventType) {
      case "executionReport":
        // Order update
        this.handleExecutionReport(data as ExecutionReportData);
        break;
      case "outboundAccountPosition":
        // Balance update
        this.handleAccountUpdate(data as AccountPositionData);
        break;
      case "balanceUpdate":
        // Single balance update
        this.handleBalanceUpdate(data as BalanceUpdateData);
        break;
      default:
        console.info("Unknown event type:", eventType);
    }
  }

  /**
   * Handle order execution report
   */
  private handleExecutionReport(data: ExecutionReportData): void {
    const orderUpdate: OrderUpdate = {
      orderId: data.i.toString(),
      symbol: data.s,
      side: data.S,
      status: data.X,
      executedQty: parseFloat(data.z),
      totalQty: parseFloat(data.q),
      price: parseFloat(data.p),
      commission: parseFloat(data.n || "0"),
      commissionAsset: data.N || "",
    };

    console.info("Order update:", orderUpdate);

    // Update database
    this.updateOrderInDatabase(orderUpdate);

    // Call callback if set
    if (this.onOrderUpdate) {
      this.onOrderUpdate(orderUpdate);
    }

    // Handle filled orders
    if (orderUpdate.status === "FILLED") {
      this.handleOrderFilled(orderUpdate);
    }
  }

  /**
   * Update order in database
   */
  private async updateOrderInDatabase(update: OrderUpdate): Promise<void> {
    try {
      const supabase = createClient();

      // Find trade by Binance order ID
      const { data: trade } = await supabase
        .from("trades")
        .select("*")
        .eq("binance_order_id", update.orderId)
        .single();

      if (!trade) return;

      // Update trade with execution details (schema may use different column names)
      await supabase
        .from("trades")
        .update({
          filled_quantity: update.executedQty,
          commission: update.commission,
          commission_asset: update.commissionAsset,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", trade.id);
    } catch (error) {
      console.error("Failed to update order in database:", error);
    }
  }

  /**
   * Handle order filled event
   */
  private async handleOrderFilled(update: OrderUpdate): Promise<void> {
    try {
      const supabase = createClient();

      // Find trade
      const { data: trade } = await supabase
        .from("trades")
        .select("*")
        .eq("binance_order_id", update.orderId)
        .single();

      if (!trade) return;

      const t = trade as any as {
        side: string;
        status: string;
        entry_price: number;
        symbol: string;
        id: string;
      };
      // If this is a closing order (SELL for LONG, BUY for SHORT)
      const isClosingOrder =
        (t.side === "LONG" && update.side === "SELL") ||
        (t.side === "SHORT" && update.side === "BUY");

      if (isClosingOrder && t.status === "OPEN") {
        // Calculate PnL
        const exitPrice = update.price;
        const pnl =
          t.side === "LONG"
            ? (exitPrice - t.entry_price) * update.executedQty
            : (t.entry_price - exitPrice) * update.executedQty;

        // Update trade as closed
        await supabase
          .from("trades")
          .update({
            status: "CLOSED",
            exit_price: exitPrice,
            realized_pnl: pnl,
            closed_at: new Date().toISOString(),
            closed_reason: "MARKET_CLOSE",
            binance_close_order_id: update.orderId,
          } as any)
          .eq("id", t.id)
          .select();

        // Create notification
        await supabase.from("notifications").insert({
          user_id: this.userId,
          type: "trade_closed",
          title: `${t.symbol} Filled`,
          message: `Order filled at $${exitPrice}. P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
          priority: "medium",
          read: false,
        } as never);
      }
    } catch (error) {
      console.error("Failed to handle order filled:", error);
    }
  }

  /**
   * Handle account position update
   */
  private handleAccountUpdate(data: AccountPositionData): void {
    console.info("Account update:", data);
    // Update balances in database if needed
  }

  /**
   * Handle balance update
   */
  private handleBalanceUpdate(data: BalanceUpdateData): void {
    console.info("Balance update:", data);
  }

  /**
   * Set callback for price updates
   */
  onPrice(callback: (update: PriceUpdate) => void): void {
    this.onPriceUpdate = callback;
  }

  /**
   * Set callback for order updates
   */
  onOrder(callback: (update: OrderUpdate) => void): void {
    this.onOrderUpdate = callback;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Close listen key on Binance
    if (this.listenKey) {
      this.closeListenKey();
    }
  }

  /**
   * Close listen key on Binance
   */
  private async closeListenKey(): Promise<void> {
    try {
      const supabase = createClient();
      await supabase.functions.invoke("binance-close-listen-key", {
        body: {
          userId: this.userId,
          listenKey: this.listenKey,
        },
      });
    } catch (error) {
      console.error("Error closing listen key:", error);
    }
  }
}

/**
 * Subscribe to symbol price updates via WebSocket
 */
export class PriceWebSocket {
  private ws: WebSocket | null = null;
  private symbols: string[];
  private onUpdate: (prices: Record<string, number>) => void;
  private reconnectAttempts = 0;

  constructor(
    symbols: string[],
    onUpdate: (prices: Record<string, number>) => void,
  ) {
    this.symbols = symbols;
    this.onUpdate = onUpdate;
  }

  connect(): void {
    const streams = this.symbols
      .map((s) => `${s.toLowerCase()}@ticker`)
      .join("/");
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.info("Price WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const { data, stream } = JSON.parse(event.data) as {
          data: BinanceTicker;
          stream: string;
        };
        const symbol = stream.split("@")[0].toUpperCase();
        const price = parseFloat(data.c); // Current price

        this.onUpdate({ [symbol]: price });
      } catch (error) {
        console.error("Price update error:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("Price WebSocket error:", error);
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= 5) return;

    this.reconnectAttempts++;
    setTimeout(() => this.connect(), 5000 * this.reconnectAttempts);
  }

  disconnect(): void {
    // Prevent reconnection on intentional disconnect
    this.reconnectAttempts = 999;

    if (this.ws) {
      // Only close if still open or connecting
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}

/**
 * Hook for using WebSocket in components
 */
export function useAutoTradingWebSocket(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderUpdate | null>(
    null,
  );
  const wsRef = useRef<AutoTradingWebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ws = new AutoTradingWebSocket(userId);
    wsRef.current = ws;

    ws.onOrder((update) => {
      setLastOrderUpdate(update);
    });

    ws.connect().then(setIsConnected);

    return () => {
      ws.disconnect();
    };
  }, [userId]);

  return { isConnected, lastOrderUpdate };
}
