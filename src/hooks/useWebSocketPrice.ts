/**
 * useWebSocketPrice — React Hook for WebSocket price updates
 * 
 * Features:
 * - Uses WebSocketManager for efficient connection sharing
 * - Automatic cleanup on unmount
 * - Error boundary integration
 * - Fallback to REST API if WS fails after 3 retries
 * - Loading states with graceful degradation
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { WebSocketManager } from "@/lib/websocket/WebSocketManager";
import { PriceFallback, fetchPriceREST, type CachedPrice } from "@/lib/websocket/fallback";
import { useRealtimeStore } from "@/store/realtime-store";

interface UseWebSocketPriceResult {
  price: number | null;
  change24h: number | null;
  isConnected: boolean;
  error: Error | null;
  isLoading: boolean;
  isFallback: boolean;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  lastUpdated: Date | null;
}

interface UseWebSocketPriceOptions {
  enabled?: boolean;
  fallbackAfterRetries?: number;
  useCache?: boolean;
}

const DEFAULT_OPTIONS: Required<UseWebSocketPriceOptions> = {
  enabled: true,
  fallbackAfterRetries: 3,
  useCache: true,
};

/**
 * Hook for getting real-time price updates for a single symbol
 */
export function useWebSocketPrice(
  symbol: string,
  options: UseWebSocketPriceOptions = {}
): UseWebSocketPriceResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedSymbol = symbol.toUpperCase();
  
  // State
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Refs
  const managerRef = useRef<WebSocketManager | null>(null);
  const fallbackRef = useRef<PriceFallback | null>(null);
  const retryCountRef = useRef(0);
  const subIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Get connection state from store
  const storeConnectionState = useRealtimeStore((state) => state.binanceStatus);
  const storePrice = useRealtimeStore((state) => state.priceCache[normalizedSymbol]);
  
  const isConnected = storeConnectionState === "connected";

  // Initialize fallback
  useEffect(() => {
    if (!opts.useCache) return;
    
    fallbackRef.current = new PriceFallback({
      symbols: [normalizedSymbol],
      enabled: false, // Will enable if WS fails
    });
    
    return () => {
      fallbackRef.current?.stop();
      fallbackRef.current = null;
    };
  }, [normalizedSymbol, opts.useCache]);

  // Load cached price on mount
  useEffect(() => {
    if (!opts.useCache || !fallbackRef.current) return;
    
    const cached = fallbackRef.current.getCachedPrice(normalizedSymbol);
    if (cached) {
      setPrice(cached.price);
      setChange24h(cached.change24h);
      setHigh24h(cached.high24h);
      setLow24h(cached.low24h);
      setVolume24h(cached.volume24h);
      setLastUpdated(new Date(cached.timestamp));
      setIsLoading(false);
    }
  }, [normalizedSymbol, opts.useCache]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!opts.enabled) {
      setIsLoading(false);
      return;
    }
    
    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);
    
    // Get manager instance
    const manager = WebSocketManager.getInstance();
    managerRef.current = manager;
    
    // Subscribe to price updates
    const subId = manager.subscribe(normalizedSymbol, (data) => {
      if (!isMountedRef.current) return;
      
      setPrice(data.price);
      setChange24h(data.changePercent24h);
      setHigh24h(data.high24h);
      setLow24h(data.low24h);
      setVolume24h(data.volume24h);
      setLastUpdated(new Date(data.timestamp));
      setIsLoading(false);
      setIsFallback(false);
      retryCountRef.current = 0;
    });
    
    subIdRef.current = subId;
    
    // Check if we already have price in store
    if (storePrice) {
      setPrice(storePrice.price);
      setChange24h(storePrice.change24h);
      setHigh24h(storePrice.high24h);
      setLow24h(storePrice.low24h);
      setVolume24h(storePrice.volume24h);
      setLastUpdated(new Date(storePrice.timestamp));
      setIsLoading(false);
    }
    
    // Set up error/retry handling
    const checkConnectionState = () => {
      if (!isMountedRef.current) return;
      
      const state = manager.getConnectionState();
      
      if (state === "error") {
        retryCountRef.current++;
        
        if (retryCountRef.current >= opts.fallbackAfterRetries) {
          // Switch to fallback
          setIsFallback(true);
          setError(new Error("WebSocket connection failed, using fallback"));
          
          if (fallbackRef.current) {
            fallbackRef.current.setEnabled(true);
            fallbackRef.current.start();
          }
        } else {
          setError(new Error(`Connection error (retry ${retryCountRef.current}/${opts.fallbackAfterRetries})`));
        }
      }
    };
    
    // Check state after a short delay
    const timeoutId = setTimeout(checkConnectionState, 5000);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      
      if (subIdRef.current) {
        manager.unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [normalizedSymbol, opts.enabled, opts.fallbackAfterRetries, storePrice]);

  // Re-fetch when store price updates
  useEffect(() => {
    if (storePrice) {
      setPrice(storePrice.price);
      setChange24h(storePrice.change24h);
      setHigh24h(storePrice.high24h);
      setLow24h(storePrice.low24h);
      setVolume24h(storePrice.volume24h);
      setLastUpdated(new Date(storePrice.timestamp));
    }
  }, [storePrice]);

  return {
    price,
    change24h,
    isConnected,
    error,
    isLoading,
    isFallback,
    high24h,
    low24h,
    volume24h,
    lastUpdated,
  };
}

/**
 * Hook for getting real-time prices for multiple symbols
 * Efficiently shares a single WebSocket connection
 */
export function useWebSocketPrices(
  symbols: string[],
  options: UseWebSocketPriceOptions = {}
): {
  prices: Record<string, CachedPrice | null>;
  isConnected: boolean;
  error: Error | null;
  isLoading: boolean;
  isFallback: boolean;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedSymbols = symbols.map((s) => s.toUpperCase());
  
  const [prices, setPrices] = useState<Record<string, CachedPrice | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  
  const managerRef = useRef<WebSocketManager | null>(null);
  const subIdsRef = useRef<string[]>([]);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  
  const storeConnectionState = useRealtimeStore((state) => state.binanceStatus);
  const storePrices = useRealtimeStore((state) => state.priceCache);
  
  const isConnected = storeConnectionState === "connected";

  useEffect(() => {
    if (!opts.enabled || normalizedSymbols.length === 0) {
      setIsLoading(false);
      return;
    }
    
    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);
    
    const manager = WebSocketManager.getInstance();
    managerRef.current = manager;
    
    // Subscribe to all symbols
    const subIds: string[] = [];
    
    for (const symbol of normalizedSymbols) {
      const subId = manager.subscribe(symbol, (data) => {
        if (!isMountedRef.current) return;
        
        setPrices((prev) => ({
          ...prev,
          [data.symbol]: {
            symbol: data.symbol,
            price: data.price,
            change24h: data.changePercent24h,
            volume24h: data.volume24h,
            high24h: data.high24h,
            low24h: data.low24h,
            timestamp: data.timestamp,
          },
        }));
      });
      
      subIds.push(subId);
    }
    
    subIdsRef.current = subIds;
    
    // Initialize from store
    const initialPrices: Record<string, CachedPrice | null> = {};
    let hasAnyPrice = false;
    
    for (const symbol of normalizedSymbols) {
      const storePrice = storePrices[symbol];
      if (storePrice) {
        initialPrices[symbol] = {
          symbol,
          price: storePrice.price,
          change24h: storePrice.change24h,
          volume24h: storePrice.volume24h,
          high24h: storePrice.high24h,
          low24h: storePrice.low24h,
          timestamp: storePrice.timestamp,
        };
        hasAnyPrice = true;
      } else {
        initialPrices[symbol] = null;
      }
    }
    
    if (hasAnyPrice) {
      setPrices(initialPrices);
      setIsLoading(false);
    }
    
    return () => {
      isMountedRef.current = false;
      
      for (const subId of subIdsRef.current) {
        manager.unsubscribe(subId);
      }
      subIdsRef.current = [];
    };
  }, [normalizedSymbols.join(","), opts.enabled, storePrices]);

  return {
    prices,
    isConnected,
    error,
    isLoading,
    isFallback,
  };
}

/**
 * Hook for manual price refresh (REST API fallback)
 */
export function usePriceRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refresh = useCallback(async (symbol: string): Promise<CachedPrice | null> => {
    setIsRefreshing(true);
    
    try {
      const price = await fetchPriceREST(symbol);
      
      // Update store
      if (price) {
        useRealtimeStore.getState().updatePrice(symbol, {
          price: price.price,
          change24h: price.change24h,
          volume24h: price.volume24h,
          high24h: price.high24h,
          low24h: price.low24h,
        });
      }
      
      return price;
    } catch (error) {
      console.error("[usePriceRefresh] Failed to refresh price:", error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  const refreshAll = useCallback(async (symbols: string[]): Promise<Record<string, CachedPrice>> => {
    setIsRefreshing(true);
    
    try {
      const { fetchPricesREST } = await import("@/lib/websocket/fallback");
      const prices = await fetchPricesREST(symbols);
      
      // Update store
      for (const [sym, data] of Object.entries(prices)) {
        useRealtimeStore.getState().updatePrice(sym, {
          price: data.price,
          change24h: data.change24h,
          volume24h: data.volume24h,
          high24h: data.high24h,
          low24h: data.low24h,
        });
      }
      
      return prices;
    } catch (error) {
      console.error("[usePriceRefresh] Failed to refresh prices:", error);
      return {};
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  return { refresh, refreshAll, isRefreshing };
}

/**
 * Hook to get connection status and metrics
 */
export function useWebSocketStatus() {
  const manager = WebSocketManager.getInstance();
  const [metrics, setMetrics] = useState(manager.getMetrics());
  
  const storeConnectionState = useRealtimeStore((state) => state.binanceStatus);
  const subscribedSymbols = useRealtimeStore((state) => state.subscribedSymbols);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(manager.getMetrics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  return {
    connectionState: storeConnectionState,
    subscribedSymbols,
    subscriptionCount: manager.getSubscriptionCount(),
    symbolCount: manager.getSymbolCount(),
    metrics,
  };
}

export type { UseWebSocketPriceResult, UseWebSocketPriceOptions, CachedPrice };
