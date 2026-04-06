/**
 * Policy Ensemble – Multi-Strategy Decision Framework
 * 
 * Combines:
 * - V2 Legacy Policies (trend, DCA, grid)
 * - PPO RL Policy
 * - Fallback Policy (conservative)
 * 
 * Features:
 * - Regime-aware policy selection
 * - Uncertainty quantification
 * - Explicit no-trade action
 * - Champion/Challenger pattern
 * 
 * @module trading/regime
 * @version 3.0.1
 */

import { type MarketRegime, RegimeClassifier } from './regime-classifier';
import { PPOAgent, ACTIONS } from '../rl/ppo-agent';
import { type PortfolioState } from '../rl/sentiment-reward';

export type PolicyType = 'v2-trend' | 'v2-dca' | 'v2-grid' | 'ppo-rl' | 'fallback' | 'no-trade';

export interface PolicyDecision {
  action: number;           // 0-4 (maps to ACTIONS: -1, -0.5, 0, 0.5, 1)
  position: number;         // -1 to 1
  side: 'buy' | 'sell' | 'hold';
  confidence: number;       // 0-1
  uncertainty: number;      // 0-1 (high = less certain)
  policy: PolicyType;
  regime: MarketRegime;
  explanation: string;
  shouldTrade: boolean;     // False = explicit no-trade
}

export interface EnsembleConfig {
  // Policy weights per regime
  weights: Record<MarketRegime, Record<PolicyType, number>>;
  
  // Confidence thresholds
  minConfidence: number;    // Minimum confidence to trade (default: 0.6)
  maxUncertainty: number;   // Maximum uncertainty allowed (default: 0.4)
  
  // No-trade conditions
  enableNoTrade: boolean;   // Allow explicit no-trade (default: true)
  noTradeRegimes: MarketRegime[]; // Regimes where no-trade is preferred
  
  // Champion/Challenger
  championPolicy: PolicyType;
  challengerPolicy: PolicyType;
  challengerTrafficPercent: number; // 0-100
}

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  weights: {
    bull: { 'v2-trend': 0.3, 'v2-dca': 0.1, 'v2-grid': 0.1, 'ppo-rl': 0.4, 'fallback': 0.1, 'no-trade': 0 },
    bear: { 'v2-trend': 0.3, 'v2-dca': 0.1, 'v2-grid': 0.1, 'ppo-rl': 0.4, 'fallback': 0.1, 'no-trade': 0 },
    chop: { 'v2-trend': 0.1, 'v2-dca': 0.3, 'v2-grid': 0.3, 'ppo-rl': 0.2, 'fallback': 0.1, 'no-trade': 0 },
    'high-vol': { 'v2-trend': 0.1, 'v2-dca': 0.1, 'v2-grid': 0.1, 'ppo-rl': 0.1, 'fallback': 0.2, 'no-trade': 0.4 },
    unknown: { 'v2-trend': 0, 'v2-dca': 0, 'v2-grid': 0, 'ppo-rl': 0, 'fallback': 0.3, 'no-trade': 0.7 }
  },
  minConfidence: 0.6,
  maxUncertainty: 0.4,
  enableNoTrade: true,
  noTradeRegimes: ['high-vol', 'unknown'],
  championPolicy: 'ppo-rl',
  challengerPolicy: 'v2-trend',
  challengerTrafficPercent: 20
};

export interface PolicyState {
  prices: { open: number; high: number; low: number; close: number; volume: number };
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    bbUpper: number;
    bbLower: number;
    bbMiddle: number;
    atr: number;
    ema20: number;
    ema50: number;
    adx: number;
  };
  market: {
    fearGreedIndex: number;
    fearGreedTrend: number;
    volatility: number;
    trendStrength: number;
    regime: 'bull' | 'bear' | 'neutral' | 'volatile';
  };
  portfolio: {
    totalEquity: number;
    availableBalance: number;
    openPositions: number;
    dailyPnl: number;
    maxDrawdown: number;
    sharpe30d: number;
  };
  timeFeatures: {
    hour: number;
    dayOfWeek: number;
    dayOfMonth: number;
    month: number;
  };
}

/**
 * Policy Ensemble – Combines multiple strategies with regime-aware selection
 */
export class PolicyEnsemble {
  private config: EnsembleConfig;
  private classifier: RegimeClassifier;
  private ppoAgent: PPOAgent | null = null;
  
  // V2 Legacy policies (simplified implementations)
  private v2Policies = {
    trend: this.v2TrendPolicy.bind(this),
    dca: this.v2DCAPolicy.bind(this),
    grid: this.v2GridPolicy.bind(this)
  };
  
  constructor(
    config: Partial<EnsembleConfig> = {},
    classifier?: RegimeClassifier,
    ppoAgent?: PPOAgent
  ) {
    this.config = { ...DEFAULT_ENSEMBLE_CONFIG, ...config };
    this.classifier = classifier || new RegimeClassifier();
    this.ppoAgent = ppoAgent || null;
  }
  
  /**
   * Make trading decision using ensemble
   */
  decide(state: PolicyState, useChallenger: boolean = false): PolicyDecision {
    // Step 1: Detect regime
    const regimeFeatures = this.extractRegimeFeatures(state);
    const classification = this.classifier.classify(regimeFeatures);
    const regime = classification.regime;
    
    // Step 2: Determine which policy to use
    const policyToUse = useChallenger && Math.random() * 100 < this.config.challengerTrafficPercent
      ? this.config.challengerPolicy
      : this.config.championPolicy;
    
    // Step 3: Get decisions from all policies
    const decisions = this.gatherDecisions(state, regime);
    
    // Step 4: Weighted ensemble
    const ensembleDecision = this.computeEnsemble(decisions, regime);
    
    // Step 5: Override with specific policy if in champion/challenger mode
    let finalDecision = ensembleDecision;
    if (useChallenger) {
      finalDecision = decisions[policyToUse] || ensembleDecision;
    }
    
    // Step 6: Apply no-trade logic
    const shouldTrade = this.shouldTrade(finalDecision, regime, classification.confidence);
    
    return {
      ...finalDecision,
      shouldTrade,
      regime,
      explanation: this.generateExplanation(finalDecision, regime, shouldTrade)
    };
  }
  
  /**
   * Gather decisions from all policies
   */
  private gatherDecisions(
    state: PolicyState,
    regime: MarketRegime
  ): Record<PolicyType, Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>> {
    const decisions: Partial<Record<PolicyType, Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>>> = {};
    
    // V2 Trend
    decisions['v2-trend'] = this.v2Policies.trend(state, regime);
    
    // V2 DCA
    decisions['v2-dca'] = this.v2Policies.dca(state, regime);
    
    // V2 Grid
    decisions['v2-grid'] = this.v2Policies.grid(state, regime);
    
    // PPO RL
    decisions['ppo-rl'] = this.ppoPolicy(state);
    
    // Fallback
    decisions['fallback'] = this.fallbackPolicy(state, regime);
    
    // No-trade
    decisions['no-trade'] = {
      action: 2, // hold
      position: 0,
      side: 'hold',
      confidence: 1,
      uncertainty: 0,
      policy: 'no-trade'
    };
    
    return decisions as Record<PolicyType, Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>>;
  }
  
  /**
   * Compute weighted ensemble decision
   */
  private computeEnsemble(
    decisions: Record<PolicyType, Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>>,
    regime: MarketRegime
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    const weights = this.config.weights[regime];
    
    // Weighted average of positions
    let weightedPosition = 0;
    let totalWeight = 0;
    let avgConfidence = 0;
    let avgUncertainty = 0;
    
    for (const [policy, decision] of Object.entries(decisions)) {
      const weight = weights[policy as PolicyType] || 0;
      weightedPosition += decision.position * weight * decision.confidence;
      totalWeight += weight * decision.confidence;
      avgConfidence += decision.confidence * weight;
      avgUncertainty += decision.uncertainty * weight;
    }
    
    const finalPosition = totalWeight > 0 ? weightedPosition / totalWeight : 0;
    
    // Map position to action
    let action: number;
    if (finalPosition >= 0.75) action = 4;
    else if (finalPosition >= 0.25) action = 3;
    else if (finalPosition > -0.25) action = 2;
    else if (finalPosition > -0.75) action = 1;
    else action = 0;
    
    // Calculate disagreement as uncertainty
    const positions = Object.values(decisions).map(d => d.position);
    const variance = this.calculateVariance(positions);
    const disagreementUncertainty = Math.min(1, variance * 4); // Scale to 0-1
    
    return {
      action,
      position: finalPosition,
      side: finalPosition > 0.1 ? 'buy' : finalPosition < -0.1 ? 'sell' : 'hold',
      confidence: avgConfidence / (Object.keys(weights).length || 1),
      uncertainty: Math.max(avgUncertainty, disagreementUncertainty),
      policy: 'ppo-rl' // Primary policy
    };
  }
  
  /**
   * Determine if we should trade
   */
  private shouldTrade(
    decision: Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>,
    regime: MarketRegime,
    regimeConfidence: number
  ): boolean {
    // Always no-trade if uncertainty too high
    if (decision.uncertainty > this.config.maxUncertainty) {
      return false;
    }
    
    // No-trade regimes
    if (this.config.noTradeRegimes.includes(regime)) {
      return false;
    }
    
    // Confidence threshold
    if (decision.confidence < this.config.minConfidence) {
      return false;
    }
    
    // Regime confidence
    if (regimeConfidence < 0.5) {
      return false;
    }
    
    return true;
  }
  
  /**
   * V2 Trend Policy – SMA/EMA crossover with trend confirmation
   */
  private v2TrendPolicy(
    state: PolicyState,
    regime: MarketRegime
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    const { ema20, ema50, rsi, adx } = state.indicators;
    
    let position = 0;
    let confidence = 0.5;
    
    // EMA crossover
    if (ema20 > ema50 * 1.02) {
      position = 0.5;
      confidence = 0.7;
    } else if (ema20 < ema50 * 0.98) {
      position = -0.5;
      confidence = 0.7;
    }
    
    // RSI confirmation
    if (rsi > 70 && position > 0) {
      position *= 0.5; // Reduce position in overbought
      confidence *= 0.8;
    } else if (rsi < 30 && position < 0) {
      position *= 0.5; // Reduce position in oversold
      confidence *= 0.8;
    }
    
    // Trend strength
    confidence *= Math.min(1, adx / 50);
    
    const uncertainty = 1 - confidence;
    const action = position >= 0.5 ? 4 : position >= 0.25 ? 3 : position <= -0.5 ? 0 : position <= -0.25 ? 1 : 2;
    
    return {
      action,
      position,
      side: position > 0.1 ? 'buy' : position < -0.1 ? 'sell' : 'hold',
      confidence,
      uncertainty,
      policy: 'v2-trend'
    };
  }
  
  /**
   * V2 DCA Policy – Dollar cost averaging with market timing
   */
  private v2DCAPolicy(
    state: PolicyState,
    regime: MarketRegime
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    const { fearGreedIndex, fearGreedTrend } = state.market;
    
    let position = 0.5; // Always invest something with DCA
    let confidence = 0.6;
    
    // Increase position in fear (buy the dip)
    if (fearGreedIndex < 30) {
      position = 1;
      confidence = 0.8;
    } else if (fearGreedIndex > 70) {
      position = 0.2;
      confidence = 0.5;
    }
    
    const uncertainty = 0.3; // DCA is relatively certain
    const action = position >= 0.75 ? 4 : 3;
    
    return {
      action,
      position,
      side: 'buy',
      confidence,
      uncertainty,
      policy: 'v2-dca'
    };
  }
  
  /**
   * V2 Grid Policy – Mean reversion with grid levels
   */
  private v2GridPolicy(
    state: PolicyState,
    regime: MarketRegime
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    const { close } = state.prices;
    const { bbUpper, bbLower, bbMiddle } = state.indicators;
    
    let position = 0;
    let confidence = 0.5;
    
    const upperDist = (close - bbUpper) / bbMiddle;
    const lowerDist = (close - bbLower) / bbMiddle;
    
    // Buy near lower band
    if (lowerDist < 0.02) {
      position = 0.5;
      confidence = 0.7;
    }
    // Sell near upper band
    else if (upperDist > -0.02) {
      position = -0.5;
      confidence = 0.7;
    }
    
    const uncertainty = 0.4;
    const action = position >= 0.25 ? 3 : position <= -0.25 ? 1 : 2;
    
    return {
      action,
      position,
      side: position > 0.1 ? 'buy' : position < -0.1 ? 'sell' : 'hold',
      confidence,
      uncertainty,
      policy: 'v2-grid'
    };
  }
  
  /**
   * PPO RL Policy – Neural network policy
   */
  private ppoPolicy(
    state: PolicyState
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    if (!this.ppoAgent) {
      return {
        action: 2,
        position: 0,
        side: 'hold',
        confidence: 0.5,
        uncertainty: 0.9,
        policy: 'ppo-rl'
      };
    }
    
    const nnState = PPOAgent.encodeState(
      state.prices,
      state.indicators,
      state.market,
      state.portfolio as PortfolioState,
      state.timeFeatures
    );
    
    const result = this.ppoAgent.selectAction(nnState, false);
    const position = ACTIONS[result.action];
    
    // Convert log probability to confidence
    const confidence = Math.exp(result.logProb);
    const uncertainty = 1 - confidence;
    
    return {
      action: result.action,
      position,
      side: position > 0.1 ? 'buy' : position < -0.1 ? 'sell' : 'hold',
      confidence,
      uncertainty,
      policy: 'ppo-rl'
    };
  }
  
  /**
   * Fallback Policy – Conservative, low-risk approach
   */
  private fallbackPolicy(
    state: PolicyState,
    regime: MarketRegime
  ): Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'> {
    const { dailyPnl, maxDrawdown } = state.portfolio;
    const { fearGreedIndex } = state.market;
    
    let position = 0;
    let confidence = 0.8;
    
    // Only trade in clear conditions
    if (fearGreedIndex < 20 && maxDrawdown < 0.05) {
      position = 0.3; // Small buy in extreme fear
    } else if (fearGreedIndex > 80 && dailyPnl > 0) {
      position = -0.3; // Small sell in extreme greed with profit
    }
    
    const uncertainty = 0.2;
    const action = position >= 0.25 ? 3 : position <= -0.25 ? 1 : 2;
    
    return {
      action,
      position,
      side: position > 0.1 ? 'buy' : position < -0.1 ? 'sell' : 'hold',
      confidence,
      uncertainty,
      policy: 'fallback'
    };
  }
  
  /**
   * Extract regime features from state
   */
  private extractRegimeFeatures(state: PolicyState): {
    adx: number;
    diPlus: number;
    diMinus: number;
    ema20Slope: number;
    ema50Slope: number;
    atr14: number;
    atrPercent: number;
    bbWidth: number;
    historicalVol: number;
    volumeTrend: number;
    rsi: number;
    momentum: number;
  } {
    return {
      adx: state.indicators.adx,
      diPlus: 50 + state.indicators.macd, // Approximation
      diMinus: 50 - state.indicators.macd,
      ema20Slope: (state.indicators.ema20 - state.prices.close) / state.prices.close,
      ema50Slope: (state.indicators.ema50 - state.prices.close) / state.prices.close,
      atr14: state.indicators.atr,
      atrPercent: state.indicators.atr / state.prices.close,
      bbWidth: (state.indicators.bbUpper - state.indicators.bbLower) / state.indicators.bbMiddle,
      historicalVol: state.market.volatility,
      volumeTrend: 1,
      rsi: state.indicators.rsi,
      momentum: state.indicators.macd
    };
  }
  
  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
  
  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    decision: Omit<PolicyDecision, 'regime' | 'explanation' | 'shouldTrade'>,
    regime: MarketRegime,
    shouldTrade: boolean
  ): string {
    if (!shouldTrade) {
      return `No-trade: ${decision.uncertainty > 0.4 ? 'high uncertainty' : 'low confidence'} in ${regime} regime`;
    }
    
    return `${decision.policy} suggests ${decision.side} (confidence: ${(decision.confidence * 100).toFixed(0)}%) in ${regime} regime`;
  }
  
  /**
   * Set PPO agent (for runtime model swapping)
   */
  setPPOAgent(agent: PPOAgent): void {
    this.ppoAgent = agent;
  }
  
  /**
   * Update ensemble configuration
   */
  updateConfig(config: Partial<EnsembleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export ACTIONS for convenience
export { ACTIONS };
