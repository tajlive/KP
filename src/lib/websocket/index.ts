/**
 * WebSocket Module — Barrel exports
 * 
 * Provides a unified interface for WebSocket connections with:
 * - WebSocketManager: Core connection management with reconnect, heartbeat
 * - BinanceWebSocket: Binance-specific streams (ticker, trades, depth)
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

// Binance specific
export {
  BinanceWebSocket,
  binanceWebSocket,
  BINANCE_WS_BASE,
  type StreamType,
  type BinanceStreamOptions,
  type AggTradeData,
  type DepthData,
  type KlineData,
  type TradeCallback,
  type DepthCallback,
  type KlineCallback,
} from "./BinanceWebSocket";

// Fallback
export {
  PriceFallback,
  fetchPricesREST,
  fetchPriceREST,
  type CachedPrice,
  BINANCE_REST_API,
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
