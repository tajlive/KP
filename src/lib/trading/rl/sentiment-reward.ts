/**
 * Sentiment-RL Reward Design – Fear/Greed som belønning
 * 
 * Implements reward shaping based on:
 * 1. PnL (primary objective)
 * 2. Fear/Greed index contrarian signals
 * 3. Risk-adjusted returns (Sharpe-like)
 * 4. Market regime alignment
 * 
 * @module trading/rl/sentiment-reward
 * @version 3.0.0
 */

export interface RewardConfig {
  /** Weight for PnL component (default: 0.5) */
  pnlWeight: number;
  /** Weight for Fear/Greed signal (default: 0.3) */
  sentimentWeight: number;
  /** Weight for risk-adjusted returns (default: 0.15) */
  riskWeight: number;
  /** Weight for regime alignment (default: 0.05) */
  regimeWeight: number;
  /** Penalty factor for drawdown (default: 0.5) */
  drawdownPenalty: number;
  /** Bonus for win streaks (default: 0.02) */
  streakBonus: number;
  /** Time decay factor (default: 0.99) */
  gamma: number;
}

export interface TradeOutcome {
  pnl: number;
  pnlPct: number;
  duration: number; // seconds
  entryPrice: number;
  exitPrice: number;
  position: 'long' | 'short' | 'neutral';
  size: number;
  timestamp: Date;
}

export interface MarketContext {
  fearGreedIndex: number;
  fearGreedTrend: number; // 7-day trend (-1 to 1)
  volatility: number; // ATR as % of price
  trendStrength: number; // ADX-like (0-100)
  regime: 'bull' | 'bear' | 'neutral' | 'volatile';
}

export interface PortfolioState {
  totalEquity: number;
  availableBalance: number;
  openPositions: number;
  dailyPnl: number;
  maxDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  sharpe30d: number;
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  pnlWeight: 0.5,
  sentimentWeight: 0.3,
  riskWeight: 0.15,
  regimeWeight: 0.05,
  drawdownPenalty: 0.5,
  streakBonus: 0.02,
  gamma: 0.99
};

/**
 * Fear/Greed signal mapping with contrarian logic
 * Extreme fear = buying opportunity (+ reward)
 * Extreme greed = selling opportunity (+ reward)
 */
export function calculateSentimentSignal(
  fearGreedIndex: number,
  fearGreedTrend: number
): number {
  // Base signal from index value (contrarian)
  let baseSignal: number;
  
  if (fearGreedIndex <= 20) {
    baseSignal = 1.0; // Extreme fear - strong buy
  } else if (fearGreedIndex <= 40) {
    baseSignal = 0.5; // Fear - moderate buy
  } else if (fearGreedIndex <= 60) {
    baseSignal = 0; // Neutral
  } else if (fearGreedIndex <= 80) {
    baseSignal = -0.5; // Greed - moderate sell
  } else {
    baseSignal = -1.0; // Extreme greed - strong sell
  }
  
  // Adjust for trend (momentum vs contrarian)
  // If index is trending up (more greedy), increase sell signal
  // If index is trending down (more fearful), increase buy signal
  const trendAdjustment = fearGreedTrend * 0.3;
  
  return Math.max(-1, Math.min(1, baseSignal + trendAdjustment));
}

/**
 * Calculate position alignment with sentiment signal
 * Rewards taking positions aligned with contrarian sentiment
 */
export function calculateSentimentAlignmentReward(
  position: 'long' | 'short' | 'neutral',
  sentimentSignal: number
): number {
  let positionSignal: number;
  
  switch (position) {
    case 'long':
      positionSignal = 1;
      break;
    case 'short':
      positionSignal = -1;
      break;
    case 'neutral':
      positionSignal = 0;
      break;
  }
  
  // Reward alignment between position and sentiment signal
  // If sentiment is -1 (extreme greed/should sell) and we're short, that's good
  const alignment = positionSignal * sentimentSignal;
  
  // Scale reward: full alignment = +1, opposite = -1, neutral = 0
  return alignment;
}

/**
 * Risk-adjusted return component (Sharpe-like)
 */
export function calculateRiskAdjustedReward(
  pnlPct: number,
  portfolio: PortfolioState,
  config: RewardConfig
): number {
  // Penalize trades during high drawdown
  const drawdownFactor = Math.max(0, 1 - (portfolio.maxDrawdown * config.drawdownPenalty));
  
  // Reward based on 30-day Sharpe ratio
  const sharpeBonus = Math.max(-0.5, Math.min(0.5, portfolio.sharpe30d * 0.1));
  
  // Penalize excessive trading (high frequency with small returns)
  const scaledPnl = pnlPct * drawdownFactor;
  
  return scaledPnl + sharpeBonus;
}

/**
 * Market regime alignment reward
 */
export function calculateRegimeAlignmentReward(
  position: 'long' | 'short' | 'neutral',
  regime: MarketContext['regime']
): number {
  const regimeScores: Record<MarketContext['regime'], { long: number; short: number; neutral: number }> = {
    bull: { long: 0.1, short: -0.2, neutral: 0 },
    bear: { long: -0.2, short: 0.1, neutral: 0 },
    neutral: { long: 0, short: 0, neutral: 0.05 },
    volatile: { long: -0.1, short: -0.1, neutral: 0.1 }
  };
  
  return regimeScores[regime][position];
}

/**
 * Calculate total reward for a trade outcome
 */
export function calculateTradeReward(
  outcome: TradeOutcome,
  market: MarketContext,
  portfolio: PortfolioState,
  config: RewardConfig = DEFAULT_REWARD_CONFIG
): number {
  // 1. PnL component (primary)
  const pnlReward = Math.tanh(outcome.pnlPct * 10) * config.pnlWeight;
  
  // 2. Fear/Greed sentiment component
  const sentimentSignal = calculateSentimentSignal(market.fearGreedIndex, market.fearGreedTrend);
  const sentimentReward = calculateSentimentAlignmentReward(outcome.position, sentimentSignal) * config.sentimentWeight;
  
  // 3. Risk-adjusted component
  const riskReward = calculateRiskAdjustedReward(outcome.pnlPct, portfolio, config) * config.riskWeight;
  
  // 4. Regime alignment component
  const regimeReward = calculateRegimeAlignmentReward(outcome.position, market.regime) * config.regimeWeight;
  
  // 5. Streak bonus/penalty
  let streakReward = 0;
  if (outcome.pnl > 0 && portfolio.consecutiveWins > 2) {
    streakReward = Math.min(0.1, portfolio.consecutiveWins * config.streakBonus);
  } else if (outcome.pnl < 0 && portfolio.consecutiveLosses > 2) {
    streakReward = -Math.min(0.1, portfolio.consecutiveLosses * config.streakBonus);
  }
  
  // 6. Time decay penalty (encourage faster profitable trades)
  const timePenalty = outcome.pnl > 0 
    ? -Math.min(0.05, outcome.duration / 86400 * 0.01) // Small penalty for holding too long
    : 0;
  
  const totalReward = pnlReward + sentimentReward + riskReward + regimeReward + streakReward + timePenalty;
  
  // Clamp to [-1, 1] for numerical stability
  return Math.max(-1, Math.min(1, totalReward));
}

/**
 * Calculate episode-level reward (aggregate across trades)
 */
export function calculateEpisodeReward(
  trades: TradeOutcome[],
  marketHistory: MarketContext[],
  startEquity: number,
  endEquity: number,
  config: RewardConfig = DEFAULT_REWARD_CONFIG
): {
  totalReward: number;
  sharpeRatio: number;
  maxDrawdown: number;
  sentimentCorrelation: number;
  tradeRewards: number[];
} {
  if (trades.length === 0) {
    return {
      totalReward: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      sentimentCorrelation: 0,
      tradeRewards: []
    };
  }
  
  // Calculate individual trade rewards
  const tradeRewards: number[] = [];
  let runningEquity = startEquity;
  let peakEquity = startEquity;
  let maxDrawdown = 0;
  
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    const market = marketHistory[i] || marketHistory[marketHistory.length - 1];
    
    // Build portfolio state for this trade
    const portfolio: PortfolioState = {
      totalEquity: runningEquity,
      availableBalance: runningEquity * 0.5,
      openPositions: 1,
      dailyPnl: trade.pnl,
      maxDrawdown,
      consecutiveWins: 0, // Would track in real implementation
      consecutiveLosses: 0,
      sharpe30d: 1.0 // Placeholder
    };
    
    const reward = calculateTradeReward(trade, market, portfolio, config);
    tradeRewards.push(reward);
    
    runningEquity += trade.pnl;
    peakEquity = Math.max(peakEquity, runningEquity);
    maxDrawdown = Math.max(maxDrawdown, (peakEquity - runningEquity) / peakEquity);
  }
  
  // Calculate aggregate metrics
  const returns = trades.map(t => t.pnlPct);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance) || 1;
  const sharpeRatio = avgReturn / stdDev * Math.sqrt(252); // Annualized
  
  // Calculate sentiment correlation (did trades align with sentiment signals?)
  const sentimentSignals = marketHistory.map(m => 
    calculateSentimentSignal(m.fearGreedIndex, m.fearGreedTrend)
  );
  const tradePnls = trades.map(t => t.pnl > 0 ? 1 : -1);
  
  const correlation = calculateCorrelation(sentimentSignals.slice(0, trades.length), tradePnls);
  
  const totalReward = tradeRewards.reduce((a, b) => a + b, 0);
  
  return {
    totalReward,
    sharpeRatio,
    maxDrawdown,
    sentimentCorrelation: correlation,
    tradeRewards
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Get reward explanation for debugging
 */
export function explainReward(
  outcome: TradeOutcome,
  market: MarketContext,
  portfolio: PortfolioState,
  config: RewardConfig = DEFAULT_REWARD_CONFIG
): { component: string; value: number; weight: number; contribution: number }[] {
  const sentimentSignal = calculateSentimentSignal(market.fearGreedIndex, market.fearGreedTrend);
  
  const pnlReward = Math.tanh(outcome.pnlPct * 10);
  const sentimentReward = calculateSentimentAlignmentReward(outcome.position, sentimentSignal);
  const riskReward = calculateRiskAdjustedReward(outcome.pnlPct, portfolio, config);
  const regimeReward = calculateRegimeAlignmentReward(outcome.position, market.regime);
  
  return [
    { component: 'PnL', value: pnlReward, weight: config.pnlWeight, contribution: pnlReward * config.pnlWeight },
    { component: 'Sentiment', value: sentimentReward, weight: config.sentimentWeight, contribution: sentimentReward * config.sentimentWeight },
    { component: 'Risk-Adjusted', value: riskReward, weight: config.riskWeight, contribution: riskReward * config.riskWeight },
    { component: 'Regime', value: regimeReward, weight: config.regimeWeight, contribution: regimeReward * config.regimeWeight }
  ];
}
