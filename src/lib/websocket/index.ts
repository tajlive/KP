/**
 * WebSocket Module — Barrel exports
 * 
 * Provides a unified interface for WebSocket connections with:
 * - WebSocketManager: Core connection management (Kraken — EU/EØS 2026:
 *   eneste tallkilde; Binance er geo-blokkert og fjernet)
 * - PriceFallback: REST API fallback when WebSocket fails
 * - React hooks for easy integration
 */

// Core
export {
  WebSocketManager,
  type ConnectionState,
  type TickerData,
  type PriceCallback,
} from "./WebSocketManager";

// Fallback
export {
  PriceFallback,
  fetchPricesREST,
  fetchPriceREST,
  type CachedPrice,
  FALLBACK_INTERVAL_MS,
  CACHE_TTL_MS,
} from "./fallback";

// React hooks (re-exported from hooks module)
export {
  useWebSocketPrice,
  useWebSocketPrices,
  usePriceRefresh,
  useWebSocketStatus,
  type UseWebSocketPriceResult,
  type UseWebSocketPriceOptions,
} from "@/hooks/useWebSocketPrice";
