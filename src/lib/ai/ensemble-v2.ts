import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { TradingAgent, AgentFeatures, AgentSignal } from './agents';
import { DEFAULT_AGENTS } from './agents';
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '@/lib/trading/indicators';

export interface AgentResult {
  agent: TradingAgent;
  signal: AgentSignal;
  adjustedWeight: number;
}

export interface ConsensusResult {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string;
  agentResults: AgentResult[];
  runId: string;
}

/**
 * Calculate Hurst exponent using R/S analysis.
 * H < 0.5 = mean-reverting, H = 0.5 = random walk, H > 0.5 = trending.
 * Research: Bitcoin Hurst ~0.52 on hourly data (QuantifiedStrategies 2026).
 */
function calculateHurst(prices: number[]): number {
  if (prices.length < 30) return 0.5;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const maxChunk = Math.floor(returns.length / 2);
  const chunks = [8, 16, 32, Math.min(64, maxChunk)].filter((n) => n <= maxChunk);
  const rsValues: { n: number; rs: number }[] = [];

  for (const chunkSize of chunks) {
    const numChunks = Math.floor(returns.length / chunkSize);
    let totalRS = 0;

    for (let i = 0; i < numChunks; i++) {
      const chunk = returns.slice(i * chunkSize, (i + 1) * chunkSize);
      const mean = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      const cumDevs: number[] = [];
      let cumSum = 0;
      for (const r of chunk) {
        cumSum += r - mean;
        cumDevs.push(cumSum);
      }
      const R = Math.max(...cumDevs) - Math.min(...cumDevs);
      const S = Math.sqrt(chunk.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / chunk.length);
      if (S > 0) totalRS += R / S;
    }

    rsValues.push({ n: chunkSize, rs: totalRS / numChunks });
  }

  if (rsValues.length < 2) return 0.5;

  // Linear regression on log-log scale
  const x = rsValues.map((v) => Math.log(v.n));
  const y = rsValues.map((v) => Math.log(v.rs));
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.max(0.1, Math.min(0.9, slope));
}

function computeFeatures(prices: number[], volumes?: number[]): AgentFeatures {
  const rsiSeries = prices.length >= 14 ? calculateRSI(prices, 14) : [];
  const rsi = rsiSeries[rsiSeries.length - 1] ?? undefined;

  const macd = prices.length >= 26 ? calculateMACD(prices) : undefined;
  const macdHistogram = macd ? macd.histogram[macd.histogram.length - 1] : undefined;

  const bb = prices.length >= 20 ? calculateBollingerBands(prices, 20, 2) : [];
  const lastBB = bb[bb.length - 1];

  const sma20 = prices.length >= 20
    ? prices.slice(-20).reduce((a, b) => a + b, 0) / 20
    : undefined;
  const sma50 = prices.length >= 50
    ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50
    : undefined;

  // Simple 14-period volatility (std dev of returns)
  let volatility14: number | undefined;
  if (prices.length >= 15) {
    const returns: number[] = [];
    for (let i = prices.length - 14; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    volatility14 = Math.sqrt(variance);
  }

  // ATR approximation
  let atr14: number | undefined;
  if (prices.length >= 15) {
    const trs: number[] = [];
    for (let i = prices.length - 14; i < prices.length; i++) {
      trs.push(Math.abs(prices[i] - prices[i - 1]));
    }
    atr14 = trs.reduce((a, b) => a + b, 0) / trs.length;
  }

  // Hurst exponent for regime detection (QuantifiedStrategies 2026)
  const hurst = prices.length >= 30 ? calculateHurst(prices) : undefined;

  // 24h volume quality filter (NexusTrade: quality filters = key to profitability)
  let volumeQuality: 'high' | 'medium' | 'low' = 'medium';
  if (volumes && volumes.length >= 24) {
    const recentVol = volumes.slice(-24).reduce((a, b) => a + b, 0);
    // Heuristic: >100M USDT 24h = high quality (liquid)
    if (recentVol > 100_000_000) volumeQuality = 'high';
    else if (recentVol < 10_000_000) volumeQuality = 'low';
  }

  return {
    symbol: '',
    prices,
    volumes,
    rsi,
    macdHistogram,
    bbUpper: lastBB?.upper ?? undefined,
    bbLower: lastBB?.lower ?? undefined,
    sma20,
    sma50,
    volatility14,
    atr14,
    hurst,
    volumeQuality,
  };
}

function adjustWeight(
  baseline: number,
  stats: { win_rate: number | null; avg_r_multiple: number | null; max_drawdown: number | null } | null
): number {
  let w = baseline;
  if (!stats) return w;

  const winRate = stats.win_rate ?? 0.5;
  const avgR = stats.avg_r_multiple ?? 0;
  const dd = stats.max_drawdown ?? 0;

  // Win-rate bonus/penalty
  if (winRate > 0.55) w *= 1.2;
  else if (winRate < 0.45) w *= 0.8;

  // R-multiple bonus/penalty
  if (avgR > 1.0) w *= 1.15;
  else if (avgR < 0) w *= 0.85;

  // Drawdown penalty
  if (dd > 0.15) w *= 0.8;
  else if (dd > 0.10) w *= 0.9;

  // Hard caps
  return Math.max(0.05, Math.min(0.5, w));
}

/**
 * Detect micro-regime from recent price action + Hurst exponent.
 * Used for regime-based agent weight adjustment.
 *
 * Research: QuantifiedStrategies 2026 — Hurst is the most reliable
 * metric for distinguishing trending vs mean-reverting markets.
 */
function detectMicroRegime(
  prices: number[],
  volatility14?: number,
  hurst?: number
): 'bull' | 'bear' | 'sideways' | 'volatile' {
  if (prices.length < 20) return 'sideways';

  // Primary: use Hurst exponent if available (most statistically sound)
  if (hurst != null) {
    if (volatility14 && volatility14 > 0.04) return 'volatile';
    if (hurst > 0.55) {
      const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const currentPrice = prices[prices.length - 1];
      return currentPrice > sma20 ? 'bull' : 'bear';
    }
    if (hurst < 0.45) return 'sideways'; // mean reversion = sideways range
    return 'sideways'; // Hurst ~0.5 = random walk
  }

  // Fallback: SMA-based detection
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const currentPrice = prices[prices.length - 1];
  const vol = volatility14 ?? 0;

  if (vol > 0.04) return 'volatile';
  if (sma10 > sma20 && currentPrice > sma20 * 1.02) return 'bull';
  if (sma10 < sma20 && currentPrice < sma20 * 0.98) return 'bear';
  return 'sideways';
}

/**
 * Apply regime-based weight multipliers.
 * Strategy-Market Fit is the #1 predictor of bot profitability.
 * (Altrady 2026 research: regime-switching beats static strategies)
 */
function applyRegimeWeights(
  weights: Map<string, number>,
  regime: 'bull' | 'bear' | 'sideways' | 'volatile'
): Map<string, number> {
  const multipliers: Record<string, Record<string, number>> = {
    bull: {
      trend: 1.5,
      momentum: 1.3,
      breakout: 1.2,
      volume: 1.1,
      mean_reversion: 0.6,
      volatility: 0.7,
      grid: 0.0, // Grid inactive in trending markets
      hurst: 1.2,
      sentiment: 1.0,
    },
    bear: {
      trend: 0.5,
      momentum: 0.6,
      breakout: 0.4,
      volume: 1.0,
      mean_reversion: 1.4,
      volatility: 1.3,
      grid: 0.0, // Grid inactive in bear markets
      hurst: 1.2,
      sentiment: 1.2, // Fear signals more valuable in bear
    },
    sideways: {
      trend: 0.6,
      momentum: 0.7,
      breakout: 0.5,
      volume: 1.2,
      mean_reversion: 1.5,
      volatility: 1.0,
      grid: 1.8, // Grid is KING in sideways markets (Pionex: 2.5-4%/month)
      hurst: 1.3,
      sentiment: 0.8, // Less relevant in sideways
    },
    volatile: {
      trend: 0.7,
      momentum: 1.0,
      breakout: 1.3,
      volume: 1.4,
      mean_reversion: 1.1,
      volatility: 1.5,
      grid: 1.2, // Wide-range grid can work in volatile markets
      hurst: 1.0,
      sentiment: 1.3, // Extreme fear/greed most valuable in volatile
    },
  };

  const m = multipliers[regime] ?? {};
  const result = new Map<string, number>();
  for (const [agentId, weight] of weights) {
    result.set(agentId, weight * (m[agentId] ?? 1.0));
  }
  return result;
}

export async function runEnsembleForSymbol(
  db: SupabaseClient<Database>,
  symbol: string,
  prices: number[],
  volumes?: number[],
  opts?: {
    agents?: TradingAgent[];
    modelVersion?: string;
    featureVersion?: string;
  }
): Promise<ConsensusResult> {
  const agents = opts?.agents ?? DEFAULT_AGENTS;
  const features = computeFeatures(prices, volumes);
  features.symbol = symbol;

  const runId = crypto.randomUUID();

  // Fetch stats for all agents in one query
  const { data: statsRows } = await db
    .from('ai_agent_stats')
    .select('agent_id, win_rate, avg_r_multiple, max_drawdown')
    .eq('symbol', symbol)
    .eq('timeframe', '1h');

  const statsMap = new Map(
    (statsRows ?? []).map((r) => [
      r.agent_id,
      { win_rate: r.win_rate, avg_r_multiple: r.avg_r_multiple, max_drawdown: r.max_drawdown },
    ])
  );

  // Regime-based weight adjustment (Strategy-Market Fit)
  const regime = detectMicroRegime(prices, features.volatility14, features.hurst);

  const agentResults: AgentResult[] = [];
  const baseWeights = new Map<string, number>();
  for (const agent of agents) {
    const signal = await agent.run(symbol, features);
    const stats = statsMap.get(agent.id) ?? null;
    const performanceWeight = adjustWeight(agent.baselineWeight, stats);
    baseWeights.set(agent.id, performanceWeight);
    agentResults.push({ agent, signal, adjustedWeight: performanceWeight });
  }

  // Apply regime multipliers to weights
  const regimeWeights = applyRegimeWeights(baseWeights, regime);

  // Recompute with regime-adjusted weights
  for (const ar of agentResults) {
    ar.adjustedWeight = regimeWeights.get(ar.agent.id) ?? ar.adjustedWeight;
  }

  // Compute weighted consensus score
  let weightedSum = 0;
  let totalWeight = 0;
  for (const ar of agentResults) {
    const directionalScore =
      ar.signal.action === 'buy' ? ar.signal.confidence
      : ar.signal.action === 'sell' ? 100 - ar.signal.confidence
      : 50;
    weightedSum += directionalScore * ar.adjustedWeight;
    totalWeight += ar.adjustedWeight;
  }

  const consensusScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  let action: ConsensusResult['action'] = 'hold';
  // OPTIMIZED: Lowered thresholds from 65/35 → 55/45 based on competitor research
  // (3Commas, Cryptohopper use 50-55 for signal generation in volatile markets)
  if (consensusScore >= 55) action = 'buy';
  else if (consensusScore <= 45) action = 'sell';

  const reasoningParts = [
    `Consensus ${consensusScore}/100 → ${action.toUpperCase()} (threshold: 55/45, regime: ${regime})`,
    ...agentResults.map(
      (ar) =>
        `${ar.agent.name} (${(ar.adjustedWeight * 100).toFixed(0)}%): ${ar.signal.action.toUpperCase()} @ ${ar.signal.confidence}`
    ),
  ];

  return {
    symbol,
    action,
    confidence: consensusScore,
    reasoning: reasoningParts.join(' | '),
    agentResults,
    runId,
  };
}
