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
  type OptimalTradeParams,
  type OptimalTradeResult 
} from './engine';
