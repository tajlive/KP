// KLA-251: Optimal Trading Engine Exports
export { 
  calculateKelly, 
  updateKellyStats, 
  saveKellyStats,
  type KellyStats 
} from './kelly';

export { 
  calculateATR, 
  calculateOptimalStop, 
  saveATRCache,
  type ATRResult 
} from './atr';

export { 
  executeOptimalTrade, 
  calculateOptimalTradePreview,
  getOptimalTradeHistory,
  checkEarlyExit,
  type OptimalTradeParams,
  type OptimalTradeResult 
} from './engine';

// KLA-252: Early Exit System
export {
  evaluateEarlyExit,
  calculateRMultiple,
  shouldUpdateTrailingStop,
  type ExitSignal,
  type EarlyExitParams,
  type ExitRecommendation,
} from './early-exit';
