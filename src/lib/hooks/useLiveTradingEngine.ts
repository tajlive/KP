"use client";

import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/utils";
import { Position, useTradingStore } from "@/store/tradingStore";
import { useCallback, useEffect, useMemo, useState } from "react";

interface LiveTradeResult {
  success: boolean;
  error?: string;
  orderId?: string;
}

export interface LiveTradingEngine {
  balance: number;
  positions: Position[];
  price: number;
  unrealizedPnL: number;
  maxDrawdown: number;
  pnlHistory: number[];
  placeOrder: (order: {
    side: "buy" | "sell";
    type: "market" | "limit";
    amount: number;
    price?: number;
  }) => Promise<LiveTradeResult>;
  closePosition: (
    positionId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  error: string | null;
  binanceStatus: "connected" | "disconnected" | "checking";
}

const INITIAL_PRICE = 850000; // BTC price in NOK

export function useLiveTradingEngine(symbol: string): LiveTradingEngine {
  const { user } = useAuth();
  const supabase = createClient();

  const {
    positions,
    marketData,
    updateMarketData,
    openPosition,
    closePosition: closeStorePosition,
  } = useTradingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pnlHistory] = useState<number[]>([]);
  const [maxDrawdown] = useState(0);
  const [binanceStatus, setBinanceStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [liveBalance, setLiveBalance] = useState(0);

  // Get current price
  const price = marketData[symbol]?.price || INITIAL_PRICE;

  // Check Binance connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!user) {
        setBinanceStatus("disconnected");
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("tier")
          .eq("user_id" as unknown, user.id)
          .maybeSingle();

        const liveTiers = ["master", "phd", "professor"];
        if (profileError || !liveTiers.includes(profile?.tier || "")) {
          setBinanceStatus("disconnected");
          return;
        }

        // Verify API key works by fetching account info
        const response = await fetch("/api/binance/account", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLiveBalance(data.balance || 0);
          setBinanceStatus("connected");
        } else {
          setBinanceStatus("disconnected");
        }
      } catch (err) {
        console.error("Error checking Binance connection:", err);
        setBinanceStatus("disconnected");
      }
    };

    checkConnection();
  }, [user]);

  // Update price from Binance WebSocket or API
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
        );
        if (response.ok) {
          const data = await response.json();
          const newPrice = parseFloat(data.price);

          // Convert to NOK (simplified - would use actual exchange rate)
          const nokPrice = newPrice * 8.5; // Approximate USD to NOK

          updateMarketData(symbol, {
            price: nokPrice,
            lastUpdate: new Date().toISOString(),
          });

          // Update position PnLs
          positions.forEach((pos) => {
            useTradingStore.getState().updatePosition(pos.id, nokPrice);
          });
        }
      } catch (err) {
        console.error("Error fetching price:", err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [symbol]);

  // Calculate unrealized PnL
  const unrealizedPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  }, [positions]);

  // Place order via Binance API
  const placeOrder = useCallback(
    async (order: {
      side: "buy" | "sell";
      type: "market" | "limit";
      amount: number;
      price?: number;
    }): Promise<LiveTradeResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error("Not authenticated");
        }

        if (binanceStatus !== "connected") {
          throw new Error("Binance not connected");
        }

        // Optimistic: show position in UI immediately
        const optimisticResult = order.side === "buy" ? openPosition({
          symbol,
          side: "long",
          entryPrice: price,
          quantity: order.amount,
          leverage: 1,
        }) : undefined;
        const tempPositionId = optimisticResult?.position?.id;

        // Execute on Binance
        const response = await fetch("/api/binance/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            side: order.side.toUpperCase(),
            type: order.type.toUpperCase(),
            quantity: order.amount,
            price: order.price,
          }),
        });

        if (!response.ok) {
          // Rollback optimistic position
          if (tempPositionId) closeStorePosition(tempPositionId);
          const errorData = await response.json();
          throw new Error(errorData.message || "Order failed");
        }

        const result = await response.json();

        // Record in database (non-blocking)
        supabase.from("trades").insert({
          user_id: user.id,
          mode: "live",
          trading_pair: symbol.replace("USDT", "/USDT"),
          binance_order_id: result.orderId,
          side: order.side,
          order_type: order.type,
          quantity: order.amount,
          price: result.price || price,
          total_value: order.amount * (result.price || price),
          fee: 0,
          status: "filled",
          idempotency_key: `live-${Date.now()}-${result.orderId}`,
          executed_at: new Date().toISOString(),
        }).then(({ error: dbErr }) => {
          if (dbErr) console.error("Trade DB insert failed:", dbErr);
        });

        return {
          success: true,
          orderId: result.orderId,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Trade failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [user, symbol, price, binanceStatus, supabase, openPosition],
  );

  // Close position via Binance API
  const closePositionHandler = useCallback(
    async (
      positionId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const position = positions.find((p) => p.id === positionId);
        if (!position) {
          throw new Error("Position not found");
        }

        // Execute sell order on Binance
        const response = await fetch("/api/binance/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            side: "SELL",
            type: "MARKET",
            quantity: position.quantity,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Close order failed");
        }

        const result = await response.json();

        // Update database
        if (user) {
          await supabase
            .from("trades")
            .update({
              status: "closed",
              exit_price: result.price || price,
              realized_pnl: position.pnl,
              closed_at: new Date().toISOString(),
            })
            .eq("id", positionId);
        }

        // Update local store
        closeStorePosition(positionId);

        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Close failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [positions, symbol, price, user, supabase, closeStorePosition],
  );

  return {
    balance: liveBalance,
    positions,
    price,
    unrealizedPnL,
    maxDrawdown,
    pnlHistory,
    placeOrder,
    closePosition: closePositionHandler,
    isLoading,
    error,
    binanceStatus,
  };
}
