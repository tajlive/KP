/**
 * Ensemble AI Signal Engine
 * KLA-PROFIT1: Profit-Max AI Engine
 *
 * Combines:
 * - 40% Technical Analysis (RSI, MACD, Bollinger)
 * - 40% GPT/LLM signal (Perplexity Sonar / Cloudflare AI)
 * - 20% Market Regime (HMM-style bull/bear/range)
 *
 * Goals: Sharpe >1.5, Profit Factor >2.0, Max DD <15%, Win-rate >80%
 */

import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '@/lib/trading/indicators';
import { calculateKelly } from '@/lib/trading/optimal';
import { regimeScanWithFallback } from './sonar';
import type { MarketRegime } from './sonar/types';

export type EnsembleAction = 'BUY' | 'SELL' | 'HOLD';

export interface EnsembleSignal {
  symbol: string;
  action: EnsembleAction;
  confidence: number; // 0-100
  reasoning: string;
  scores: {
    ta: number; // 0-100
    ai: number; // 0-100
    regime: number; // 0-100
    sentiment: number; // -1 to 1
  };
  indicators: {
    rsi: number | null;
    macdSignal: 'bullish' | 'bearish' | 'neutral';
    bbPosition: 'upper' | 'middle' | 'lower' | null;
  };
  sizing: {
    kellyPct: number; // 0-1
    maxRiskPct: number; // capped at 5%
  };
  metadata: {
    regime: MarketRegime;
    regimeConfidence: number;
    timestamp: string;
  };
}

export interface EnsembleEngineOptions {
  symbol: string;
  prices: number[];
  volumes?: number[];
  useLLM?: boolean;
  riskProfile?: 'conservative' | 'balanced' | 'aggressive';
  confidenceThreshold?: number;
}

// =============================================================================
// 1. Technical Analysis Score (0-100)
// =============================================================================

function computeTAScore(prices: number[]): { score: number; details: EnsembleSignal['indicators'] } {
  if (prices.length < 50) {
    return {
      score: 50,
      details: { rsi: null, macdSignal: 'neutral', bbPosition: null },
    };
  }

  const rsiSeries = calculateRSI(prices, 14);
  const rsi = rsiSeries[rsiSeries.length - 1] ?? 50;

  const macd = calculateMACD(prices);
  const lastHistogram = macd.histogram[macd.histogram.length - 1] ?? 0;
  const prevHistogram = macd.histogram[macd.histogram.length - 2] ?? 0;
  const macdSignal: EnsembleSignal['indicators']['macdSignal'] =
    lastHistogram > 0 && lastHistogram > prevHistogram
      ? 'bullish'
      : lastHistogram < 0 && lastHistogram < prevHistogram
        ? 'bearish'
        : 'neutral';

  const bb = calculateBollingerBands(prices, 20, 2);
  const lastPrice = prices[prices.length - 1];
  const lastBB = bb[bb.length - 1];
  const lastUpper = lastBB?.upper ?? lastPrice;
  const lastLower = lastBB?.lower ?? lastPrice;
  const bbPosition: EnsembleSignal['indicators']['bbPosition'] =
    lastPrice >= lastUpper ? 'upper' : lastPrice <= lastLower ? 'lower' : 'middle';

  // RSI contribution: oversold = bullish, overbought = bearish
  let rsiScore = 50;
  if (rsi !== null) {
    if (rsi < 30) rsiScore = 85;
    else if (rsi < 40) rsiScore = 70;
    else if (rsi > 70) rsiScore = 15;
    else if (rsi > 60) rsiScore = 30;
    else rsiScore = 50;
  }

  // MACD contribution
  let macdScore = 50;
  if (macdSignal === 'bullish') macdScore = 80;
  else if (macdSignal === 'bearish') macdScore = 20;

  // Bollinger contribution
  let bbScore = 50;
  if (bbPosition === 'lower') bbScore = 75;
  else if (bbPosition === 'upper') bbScore = 25;

  // Weighted average: RSI 40% + MACD 35% + BB 25%
  const score = Math.round(rsiScore * 0.4 + macdScore * 0.35 + bbScore * 0.25);

  return {
    score,
    details: { rsi, macdSignal, bbPosition },
  };
}

// =============================================================================
// 2. LLM / AI Score (0-100) — via Perplexity Sonar with structured prompt
// =============================================================================

async function fetchLLMSignal(
  symbol: string,
  prices: number[],
  rsi: number | null,
  regime: MarketRegime
): Promise<{ score: number; reasoning: string; sentiment: number }> {
  const currentPrice = prices[prices.length - 1];
  const priceHistory = prices.slice(-100);
  const avgVolume = 0; // placeholder if not provided

  const prompt = `Analyze ${symbol} 1h OHLCV:
1. RSI(14): ${rsi ?? 'N/A'}
2. MACD(12,26,9): latest histogram trend
3. Sentiment: X/Reddit aggregate score (-1 to 1)
4. Regime: ${regime}

Current price: ${currentPrice}. Recent 20 prices: ${priceHistory.slice(-20).join(', ')}

Output ONLY valid JSON in this exact format:
{"signal": "BUY" | "SELL" | "HOLD", "confidence": 0-100, "sentiment": -1 to 1, "reasoning": "..."}
Threshold: confidence > 80 to execute.`;

  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY missing');
    }

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a quantitative trading assistant. Respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 256,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`Perplexity API error ${res.status}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? '';

    // Extract JSON from possible markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    const signal = String(parsed.signal || 'HOLD').toUpperCase() as EnsembleAction;
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence || 50)));
    const sentiment = Math.min(1, Math.max(-1, Number(parsed.sentiment || 0)));

    // Map signal direction to 0-100 score (HOLD = 50)
    let score = 50;
    if (signal === 'BUY') score = confidence;
    else if (signal === 'SELL') score = 100 - confidence;

    return {
      score,
      reasoning: parsed.reasoning || `LLM ${signal} @ ${confidence}%`,
      sentiment,
    };
  } catch (err) {
    console.error('[EnsembleEngine] LLM fetch failed:', err);
    // Fallback to neutral
    return { score: 50, reasoning: 'LLM fallback (neutral)', sentiment: 0 };
  }
}

// =============================================================================
// 3. Regime Score (0-100)
// =============================================================================

function regimeToScore(regime: MarketRegime, confidence: number): number {
  // Map regime to directional score
  const baseScores: Record<MarketRegime, number> = {
    bull: 75,
    bear: 25,
    range: 50,
    unclear: 50,
  };
  const base = baseScores[regime] ?? 50;
  // Blend with 50 according to regime confidence
  return base * confidence + 50 * (1 - confidence);
}

// =============================================================================
// 4. Kelly Position Sizing
// =============================================================================

function computeKellySizing(
  winRate: number,
  avgWinPct: number,
  avgLossPct: number,
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
): { kellyPct: number; maxRiskPct: number } {
  const stats = { winrate: winRate, avgWin: avgWinPct, avgLoss: avgLossPct };
  const kelly = calculateKelly(stats, riskProfile);
  return {
    kellyPct: kelly,
    maxRiskPct: Math.min(kelly, 0.05), // Hard cap 5%
  };
}

// =============================================================================
// 5. Ensemble Orchestrator
// =============================================================================

export async function generateEnsembleSignal(
  options: EnsembleEngineOptions
): Promise<EnsembleSignal> {
  const { symbol, prices, useLLM = true, riskProfile = 'balanced' } = options;

  // 1. TA
  const ta = computeTAScore(prices);

  // 2. Regime
  const regimeResult = await regimeScanWithFallback({ mode: 'high' });
  const regimeScore = regimeToScore(regimeResult.regime, regimeResult.confidence);

  // 3. LLM
  let ai = { score: 50, reasoning: 'LLM skipped', sentiment: 0 };
  if (useLLM) {
    ai = await fetchLLMSignal(symbol, prices, ta.details.rsi, regimeResult.regime);
  }

  // 4. Weighted ensemble
  const finalScore = Math.round(
    ta.score * 0.4 + ai.score * 0.4 + regimeScore * 0.2
  );

  let action: EnsembleAction = 'HOLD';
  if (finalScore >= 80) action = 'BUY';
  else if (finalScore <= 20) action = 'SELL';

  // Build reasoning string
  const reasoning = [
    `Ensemble score ${finalScore}/100 (TA:${ta.score} AI:${Math.round(ai.score)} Regime:${Math.round(regimeScore)})`,
    `TA: RSI=${ta.details.rsi ?? 'N/A'}, MACD=${ta.details.macdSignal}, BB=${ta.details.bbPosition ?? 'N/A'}`,
    `AI: ${ai.reasoning}`,
    `Regime: ${regimeResult.regime} (${Math.round(regimeResult.confidence * 100)}% confidence)`,
  ].join(' | ');

  // 5. Kelly sizing — default conservative estimates until backtest hydrates
  const sizing = computeKellySizing(0.67, 2.5, 1.2, riskProfile);

  return {
    symbol,
    action,
    confidence: finalScore,
    reasoning,
    scores: {
      ta: ta.score,
      ai: Math.round(ai.score),
      regime: Math.round(regimeScore),
      sentiment: ai.sentiment,
    },
    indicators: ta.details,
    sizing,
    metadata: {
      regime: regimeResult.regime,
      regimeConfidence: regimeResult.confidence,
      timestamp: new Date().toISOString(),
    },
  };
}

// =============================================================================
// 6. Batch generator for cron jobs
// =============================================================================

export interface BatchEnsembleResult {
  symbol: string;
  signal: EnsembleSignal | null;
  error?: string;
}

export async function generateEnsembleSignalsBatch(
  symbols: string[],
  fetchPrices: (symbol: string) => Promise<number[]> | number[],
  options?: Omit<EnsembleEngineOptions, 'symbol' | 'prices'>
): Promise<BatchEnsembleResult[]> {
  const results: BatchEnsembleResult[] = [];

  for (const symbol of symbols) {
    try {
      const prices = await fetchPrices(symbol);
      if (!prices || prices.length < 50) {
        results.push({ symbol, signal: null, error: 'Insufficient price data' });
        continue;
      }
      const signal = await generateEnsembleSignal({
        symbol,
        prices,
        ...options,
      });
      results.push({ symbol, signal });
    } catch (err) {
      results.push({
        symbol,
        signal: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}
