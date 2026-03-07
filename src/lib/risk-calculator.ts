/**
 * Risk Calculator Utilities
 * Provides risk checking and calculation functions for autotrading
 */

// Matches actual Supabase schema
export interface RiskProfile {
  id: string;
  user_id: string;
  name: string;
  max_position_size_pct: number;
  max_total_exposure_pct: number;
  stop_loss_pct: number;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Derived/default values
  max_daily_loss_pct?: number;
  take_profit_pct?: number;
  max_concurrent_trades?: number;
  daily_trade_limit?: number;
  min_trade_amount?: number;
  max_trade_amount?: number;
  is_default?: boolean;
}

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  maxAmount?: number;
}

export interface TradeContext {
  tradeAmount: number;
  currentExposure: number;
  dailyLoss: number;
  openTrades: number;
  dailyTradeCount: number;
  accountBalance: number;
}

// Default values for optional fields
const DEFAULTS = {
  max_concurrent_trades: 3,
  daily_trade_limit: 10,
  min_trade_amount: 10,
  max_trade_amount: 1000,
  max_daily_loss_pct: 2,
  take_profit_pct: 10,
};

/**
 * Check if a trade is allowed based on risk profile limits
 */
export function checkTradeRisk(
  profile: RiskProfile,
  context: TradeContext
): RiskCheck {
  const { tradeAmount, currentExposure, dailyLoss, openTrades, dailyTradeCount, accountBalance } = context;

  const maxConcurrentTrades = profile.max_concurrent_trades ?? DEFAULTS.max_concurrent_trades;
  const dailyTradeLimit = profile.daily_trade_limit ?? DEFAULTS.daily_trade_limit;
  const minTradeAmount = profile.min_trade_amount ?? DEFAULTS.min_trade_amount;
  const maxTradeAmount = profile.max_trade_amount ?? DEFAULTS.max_trade_amount;
  const maxDailyLossPct = profile.max_daily_loss_pct ?? DEFAULTS.max_daily_loss_pct;

  // Check concurrent trades limit
  if (openTrades >= maxConcurrentTrades) {
    return {
      allowed: false,
      reason: `Maks samtidige handler (${maxConcurrentTrades}) nådd`
    };
  }

  // Check daily trade limit
  if (dailyTradeCount >= dailyTradeLimit) {
    return {
      allowed: false,
      reason: `Daglig handelsgrense (${dailyTradeLimit}) nådd`
    };
  }

  // Check trade amount limits
  if (tradeAmount < minTradeAmount) {
    return {
      allowed: false,
      reason: `Handel under minimum (${minTradeAmount} USDT)`
    };
  }

  if (tradeAmount > maxTradeAmount) {
    return {
      allowed: false,
      reason: `Handel over maksimum (${maxTradeAmount} USDT)`,
      maxAmount: maxTradeAmount
    };
  }

  // Check position size vs balance
  const positionSizePercent = (tradeAmount / accountBalance) * 100;
  if (positionSizePercent > profile.max_position_size_pct) {
    const maxAmount = (accountBalance * profile.max_position_size_pct) / 100;
    return {
      allowed: false,
      reason: `Posisjonsstørrelse ${positionSizePercent.toFixed(2)}% overstiger maks ${profile.max_position_size_pct}%`,
      maxAmount
    };
  }

  // Check total exposure
  const totalExposurePercent = ((currentExposure + tradeAmount) / accountBalance) * 100;
  if (totalExposurePercent > profile.max_total_exposure_pct) {
    return {
      allowed: false,
      reason: `Total eksponering ${totalExposurePercent.toFixed(2)}% overstiger maks ${profile.max_total_exposure_pct}%`
    };
  }

  // Check daily loss limit
  const dailyLossPercent = (Math.abs(dailyLoss) / accountBalance) * 100;
  if (dailyLossPercent > maxDailyLossPct) {
    return {
      allowed: false,
      reason: `Daglig tap ${dailyLossPercent.toFixed(2)}% overstiger maks ${maxDailyLossPct}%`
    };
  }

  return { allowed: true };
}

/**
 * Calculate stop loss price based on entry and profile
 */
export function calculateStopLoss(
  entryPrice: number,
  profile: RiskProfile,
  side: 'LONG' | 'SHORT'
): number {
  const stopLossMultiplier = profile.stop_loss_pct / 100;
  if (side === 'LONG') {
    return entryPrice * (1 - stopLossMultiplier);
  } else {
    return entryPrice * (1 + stopLossMultiplier);
  }
}

/**
 * Calculate take profit price based on entry and profile
 */
export function calculateTakeProfit(
  entryPrice: number,
  profile: RiskProfile,
  side: 'LONG' | 'SHORT'
): number {
  const takeProfitPct = profile.take_profit_pct ?? DEFAULTS.take_profit_pct;
  const takeProfitMultiplier = takeProfitPct / 100;
  if (side === 'LONG') {
    return entryPrice * (1 + takeProfitMultiplier);
  } else {
    return entryPrice * (1 - takeProfitMultiplier);
  }
}

/**
 * Calculate position size based on risk per trade
 */
export function calculatePositionSize(
  accountBalance: number,
  profile: RiskProfile,
  entryPrice: number,
  stopLossPrice: number
): number {
  const maxDailyLossPct = profile.max_daily_loss_pct ?? DEFAULTS.max_daily_loss_pct;
  const maxTradeAmount = profile.max_trade_amount ?? DEFAULTS.max_trade_amount;

  // Risk amount = account balance * max daily loss percent
  const maxRiskAmount = (accountBalance * maxDailyLossPct) / 100;

  // Risk per unit = |entry - stop loss|
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);

  if (riskPerUnit === 0) return 0;

  // Position size = risk amount / risk per unit
  let positionSize = maxRiskAmount / riskPerUnit;

  // Cap at max position size percent
  const maxPositionValue = (accountBalance * profile.max_position_size_pct) / 100;
  const maxPositionSize = maxPositionValue / entryPrice;

  positionSize = Math.min(positionSize, maxPositionSize);

  // Cap at max trade amount
  const maxTradeSize = maxTradeAmount / entryPrice;
  positionSize = Math.min(positionSize, maxTradeSize);

  return positionSize;
}

/**
 * Get risk score (0-100) based on profile settings
 */
export function getRiskScore(profile: RiskProfile): number {
  const maxDailyLossPct = profile.max_daily_loss_pct ?? DEFAULTS.max_daily_loss_pct;
  const maxConcurrentTrades = profile.max_concurrent_trades ?? DEFAULTS.max_concurrent_trades;

  // Higher values = more risky
  const positionWeight = profile.max_position_size_pct / 30 * 25;
  const lossWeight = maxDailyLossPct / 10 * 25;
  const exposureWeight = profile.max_total_exposure_pct / 100 * 25;
  const tradesWeight = maxConcurrentTrades / 10 * 25;

  return Math.min(100, Math.round(positionWeight + lossWeight + exposureWeight + tradesWeight));
}

/**
 * Get risk level label based on score
 */
export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 33) return 'low';
  if (score < 66) return 'medium';
  return 'high';
}
