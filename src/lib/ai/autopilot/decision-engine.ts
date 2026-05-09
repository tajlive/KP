/**
 * KlarBot AI Autopilot — Decision Engine
 *
 * Én funksjon: `runAutopilotAnalysis()`
 * Input:  risk_appetite, total_capital_nok, max_pairs
 * Output: regime, strategy, ranked_pairs, capital_allocation
 *
 * Gjenbruker:
 *   - RegimeClassifier (src/lib/trading/regime/regime-classifier)
 *   - runEnsembleForSymbol (src/lib/ai/ensemble-v2)
 *   - OPTIMIZED_PROFILES (src/lib/config/optimized-risk-profiles)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  RegimeClassifier,
  type MarketRegime,
  type RegimeClassification,
} from "@/lib/trading/regime/regime-classifier";
import { extractFeaturesFromCandles } from "@/lib/trading/regime/tick-features";
import type { Candle } from "@/lib/trading/strategies/types";
import { runEnsembleForSymbol } from "@/lib/ai/ensemble-v2";
import {
  OPTIMIZED_PROFILES,
  type RiskLevel,
} from "@/lib/config/optimized-risk-profiles";

// ============================================================================
// Types
// ============================================================================

export type RiskAppetite = "conservative" | "moderate" | "aggressive";

export interface PairAllocation {
  symbol: string;
  capital_nok: number;
  confidence: number;
  signal_action: "buy" | "sell" | "hold";
}

export interface AutopilotDecision {
  regime: MarketRegime;
  regime_confidence: number;
  strategy: string;
  strategy_reason: string;
  pairs: PairAllocation[];
  total_capital_nok: number;
  risk_appetite: RiskAppetite;
}

// ============================================================================
// Regime → Strategy Mapping
// ============================================================================

const REGIME_STRATEGY_MAP: Record<
  MarketRegime,
  { primary: string; backup: string | null; reason: string }
> = {
  bull: {
    primary: "multisignal_aktiv",
    backup: "ai_copy",
    reason: "Sterk opptrend — momentum + breakout fungerer best",
  },
  bear: {
    primary: "dca_trygg",
    backup: null,
    reason: "Nedtrend — DCA-akklumulering med tight stop-loss",
  },
  chop: {
    primary: "grid_bot",
    backup: "dca_trygg",
    reason: "Sideways — mean reversion og grid-profit",
  },
  "high-vol": {
    primary: "ensemble_ai",
    backup: "grid_bot",
    reason: "Høy volatilitet — multi-factor med adaptive sizing",
  },
  unknown: {
    primary: "dca_trygg",
    backup: null,
    reason: "Uklart regime — konservativ tilnærming",
  },
};

// ============================================================================
// Risk Appetite → Risk Profile
// ============================================================================

const RISK_APPETITE_PROFILE: Record<RiskAppetite, RiskLevel> = {
  conservative: "conservative",
  moderate: "moderate",
  aggressive: "aggressive",
};

// ============================================================================
// Helpers
// ============================================================================

async function fetchCandles(symbol: string, limit = 55): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Binance API error: ${res.status} for ${symbol}`);
  const data = (await res.json()) as [number, string, string, string, string, string][];
  return data.map((c) => ({
    time: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

function getRegime(candles: Candle[]): { regime: MarketRegime; confidence: number } {
  try {
    const classifier = new RegimeClassifier();
    const features = extractFeaturesFromCandles(candles);
    const result: RegimeClassification = classifier.classify(features);
    return { regime: result.regime, confidence: result.confidence };
  } catch {
    return { regime: "unknown", confidence: 0.3 };
  }
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function kellyAllocate(
  signals: { symbol: string; confidence: number; action: "buy" | "sell" | "hold" }[],
  totalCapital: number,
  maxPairs: number,
  riskProfile: ReturnType<typeof getRiskProfile>,
): PairAllocation[] {
  // Filter to buy signals with confidence >= 50
  // OPTIMIZED: Lowered from 60 → 50 based on competitor research
  // (Pionex grid/DCA bots trade more actively with lower thresholds)
  const buySignals = signals
    .filter((s) => s.action === "buy" && s.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPairs);

  if (buySignals.length === 0) return [];

  const kellyFraction = riskProfile.kellyFraction;
  const maxPosPct = riskProfile.maxPositionSizePercent;

  // Normalize confidences to weights (50-100 → 0.5-1.0)
  const weights = buySignals.map((s) => Math.max(0.5, s.confidence / 100));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const allocations: PairAllocation[] = [];
  for (let i = 0; i < buySignals.length; i++) {
    const s = buySignals[i];
    // Kelly-based sizing: capital × kelly × normalized_weight
    const rawAlloc = totalCapital * kellyFraction * (weights[i] / weightSum);
    // Cap at max position size
    const capped = Math.min(rawAlloc, totalCapital * (maxPosPct / 100));
    // Ensure minimum trade size
    const finalAlloc = Math.max(capped, riskProfile.minPositionSizeUsd * 11); // ~NOK, rough

    allocations.push({
      symbol: s.symbol,
      capital_nok: Math.round(finalAlloc),
      confidence: s.confidence,
      signal_action: s.action,
    });
  }

  return allocations;
}

function getRiskProfile(appetite: RiskAppetite) {
  return OPTIMIZED_PROFILES[RISK_APPETITE_PROFILE[appetite]];
}

// ============================================================================
// Main Entry
// ============================================================================

const TOP_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "AVAXUSDT",
  "DOGEUSDT",
];

/**
 * Kjør full AI-analyse for autopilot-aktivering.
 *
 * @param risk_appetite — konservativ / moderat / aggressiv
 * @param total_capital_nok — total kapital å allokere
 * @param max_pairs — maks antall par (default 3)
 * @param db — Supabase client (valgfri, for feature-persistens)
 */
export async function runAutopilotAnalysis(
  risk_appetite: RiskAppetite,
  total_capital_nok: number,
  max_pairs = 3,
  _db?: SupabaseClient<Database>,
): Promise<AutopilotDecision> {
  // ── 1. Regime detection på BTC (proxy for hele markedet) ──────────────
  const btcCandles = await fetchCandles("BTCUSDT", 100);
  const { regime, confidence: regimeConfidence } = getRegime(btcCandles);

  // ── 2. Strategy matching ──────────────────────────────────────────────
  const strategyMap = REGIME_STRATEGY_MAP[regime];
  const selectedStrategy = strategyMap.primary;

  // ── 3. Signal ranking for alle TOP_SYMBOLS ────────────────────────────
  const signalPromises = TOP_SYMBOLS.map(async (symbol) => {
    try {
      const candles = await fetchCandles(symbol, 55);
      const prices = candles.map((c) => c.close);
      const volumes = candles.map((c) => c.volume);
      // runEnsembleForSymbol requires SupabaseClient as first arg in some signatures
      // Use the sync signal-generator fallback for autopilot decisions
      const result = await runEnsembleForSymbol(
        _db ?? ({} as SupabaseClient<Database>),
        symbol,
        prices,
        volumes
      );
      return {
        symbol,
        action: result.action,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (err) {
      console.warn(`[Autopilot] Signal failed for ${symbol}:`, (err as Error).message);
      return { symbol, action: "hold" as const, confidence: 0, reasoning: "Error" };
    }
  });

  const allSignals = await Promise.all(signalPromises);

  // ── 4. Capital allocation ─────────────────────────────────────────────
  const riskProfile = getRiskProfile(risk_appetite);
  const allocations = kellyAllocate(allSignals, total_capital_nok, max_pairs, riskProfile);

  return {
    regime,
    regime_confidence: Math.round(regimeConfidence * 100) / 100,
    strategy: selectedStrategy,
    strategy_reason: strategyMap.reason,
    pairs: allocations,
    total_capital_nok,
    risk_appetite,
  };
}
