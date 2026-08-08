/**
 * Realtime module barrel exports
 * 
 * @deprecated Use @/lib/websocket for new code. This module is kept for backwards compatibility.
 * Migration: 
 *   - WebSocketManager → import from @/lib/websocket
 *   - PriceAggregator → consider using useWebSocketPrice hook instead
 */

export { PriceAggregator } from "./price-aggregator";

// Re-export new WebSocket module for convenience
export {
  WebSocketManager as RobustWebSocketManager,
  type ConnectionState,
  type TickerData as RobustTickerData,
  type PriceCallback as RobustPriceCallback,
} from "@/lib/websocket/WebSocketManager";

export {
  PriceFallback,
  fetchPricesREST,
  fetchPriceREST,
  type CachedPrice,
} from "@/lib/websocket/fallback";
