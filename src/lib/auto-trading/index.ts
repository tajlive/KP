/**
 * Auto-Trading System - Main Export
 * Complete automated trading engine with risk management
 * Version 2.0 - Med 10 optimaliseringer for maks avkastning
 */

// Types
export * from './types'

// Core modules - explicit exports to avoid conflicts
export {
  getUserConfig,
  createUserConfig,
  getActiveSession,
  createSession,
  updateSession,
  pauseSession,
  stopSession,
  getSessionTrades,
  getOpenTrades,
  createTrade,
  closeTrade as closeTradeInDb,
  getTodayMetrics,
  updateDailyMetrics
} from './supabase'

export * from './risk-management'
export * from './phase-progression'

// Market analysis
export * from './market-regime'

// Performance & monitoring
export * from './performance-review'
export * from './notifications'

// Advanced features
export * from './backtest-engine'
export * from './portfolio-optimizer'
export * from './ml-risk-assessment'

// NEW: Multi-timeframe analysis
export * from './multi-timeframe'

// NEW: Enhancements (Rebalancing, Education Gates, Backtest helpers)
export {
  checkRebalanceNeeded,
  executeRebalancing,
  checkEducationStatus,
  canAccessFeature,
  formatBacktestResult,
  getRebalancingSchedule,
  type EducationStatus,
  type BacktestResult
} from './enhancements'

// Binance integration
export {
  executeTrade,
  closeTrade,
  syncOpenTrades,
  BINANCE_REFERRAL
} from './binance-executor'

export * from './binance-websocket'

// Strategies (inkluderer nye Grid og DCA)
export * from './strategies'

// Binance Referral (also exported from binance-executor)
export const BINANCE_REFERRAL_LINK = 'https://accounts.binance.com/register?ref=43427892'

/**
 * Auto-Trading System Architecture
 * Complete system with 8 layers of protection + 10 optimaliseringer
 * 
 * Optimaliseringer implementert:
 * 1. ✅ Trailing Stop-Loss
 * 2. ✅ ATR-baserte dynamiske stop-loss
 * 3. ✅ Delvis profitt-taking
 * 4. ✅ Grid Trading strategi
 * 5. ✅ DCA Bot med Smart DCA
 * 6. ✅ Korrelasjonssjekk
 * 7. ✅ Multi-timeframe analyse
 * 8. ✅ Backtest integrasjon
 * 9. ✅ Smart rebalansering
 * 10. ✅ Utdannings-gates
 */

export const AUTO_TRADING_VERSION = '2.0.0'
export const AUTO_TRADING_LAST_UPDATED = '2026-02-13'

// Strategi-type exports for UI
export { getStrategyTypes, type StrategyCreationParams } from './strategies'

// KLA-137: Preset profiles + Realtime hook
export * from './preset-profiles'
