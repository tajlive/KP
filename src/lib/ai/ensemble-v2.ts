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

  const agentResults: AgentResult[] = [];
  for (const agent of agents) {
    const signal = await agent.run(symbol, features);
    const stats = statsMap.get(agent.id) ?? null;
    const adjustedWeight = adjustWeight(agent.baselineWeight, stats);
    agentResults.push({ agent, signal, adjustedWeight });
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
  if (consensusScore >= 65) action = 'buy';
  else if (consensusScore <= 35) action = 'sell';

  const reasoningParts = [
    `Consensus ${consensusScore}/100 → ${action.toUpperCase()}`,
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
