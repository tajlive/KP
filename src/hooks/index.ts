// Analytics hooks
export { usePageTracking, useElementTracking } from './usePageTracking';

// Auth hooks
export { useAuth } from './useAuth';

// Notification hooks
export { usePushNotifications } from './usePushNotifications';

// WebSocket hooks
export {
  useWebSocketPrice,
  useWebSocketPrices,
  usePriceRefresh,
  useWebSocketStatus,
  type UseWebSocketPriceResult,
  type UseWebSocketPriceOptions,
} from './useWebSocketPrice';

// Legacy price hooks (backward compatibility)
export { usePrices, useAnimatedPrice } from './usePrices';

// Trading hooks
export {
  useTradeSuccess,
  TradeSuccessProvider,
} from './useTradeSuccess';
export type { TradeData } from './useTradeSuccess';

// Animation hooks
export { useCountUp } from './useCountUp';

// Live data hooks
export { useLivePnL } from './useLivePnL';
export type { LivePnLData } from './useLivePnL';
