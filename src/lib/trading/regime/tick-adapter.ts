/**
 * Dark Fleet Tick Adapter
 *
 * Bridges the tick engine's StrategyInput/StrategySignal types with the
 * advanced AI/ML components (RegimeClassifier, ConfluentSignalEngine).
 *
 * Design goals:
 * 1. Synchronous — no async inside evaluate(), keeps tick engine simple
 * 2. Safe — always falls back to V2 baseline if anything fails
 * 3. Observable — enriches indicators with regime + ensemble metadata
 */

import type { StrategyInput, StrategySignal } from "../strategies/types";
import type { MarketRegime } from "./regime-classifier";
import { RegimeClassifier } from "./regime-classifier";
import { extractFeaturesFromCandles } from "./tick-features";
import { resolveStrategy } from "../strategies";
import { generateSignal } from "../signal-generator";
import { isMechanicalStrategy } from "../mechanical-strategy";

// ============================================================================
// Types
// ============================================================================

export interface DarkFleetSignal extends StrategySignal {
  indicators: NonNullable<StrategySignal["indicators"]> & {
    darkFleet: true;
    regime: MarketRegime;
    regimeConfidence: number;
    ensembleScore: number;
    baseSignal: string;
    confluentSignal?: string;
  };
}

export interface DarkFleetConfig {
  /** Master switch */
  enabled: boolean;
  /** Weight given to V2 technical signal (0-1) */
  technicalWeight: number;
  /** Weight given to confluent/narrative signal (0-1) */
  narrativeWeight: number;
  /** Weight given to regime bias (0-1) */
  regimeWeight: number;
  /** Minimum ensemble score to trigger buy/sell */
  threshold: number;
  /** Maximum allowed position size */
  maxPositionSize: number;
}

export const DEFAULT_DARK_FLEET_CONFIG: DarkFleetConfig = {
  enabled: true, // V2: Always enabled for production
  technicalWeight: 0.5,
  narrativeWeight: 0.25,
  regimeWeight: 0.25,
  threshold: 0.3,
  maxPositionSize: 0.08, // Reduced from 0.12 — safer sizing for new strategies
};

// ============================================================================
// Regime-based weights (from ConfluentSignalEngine)
// ============================================================================

function getWeightsByRegime(regime: MarketRegime): {
  technical: number;
  narrative: number;
  regime: number;
} {
  switch (regime) {
    case "bull":
    case "bear":
      // Trending market: narrative + regime matter more
      return { technical: 0.35, narrative: 0.35, regime: 0.3 };
    case "chop":
      // Sideways: technicals (RSI/Support/Resistance) are more reliable
      return { technical: 0.6, narrative: 0.2, regime: 0.2 };
    case "high-vol":
    case "unknown":
    default:
      // Uncertain: conservative, rely on technicals + fallback
      return { technical: 0.5, narrative: 0.25, regime: 0.25 };
  }
}

// ============================================================================
// Main Adapter
// ============================================================================

/**
 * Evaluate a trading signal using the Dark Fleet ensemble.
 *
 * @param input — standard StrategyInput from tick engine
 * @param userConfig — optional override of default weights/thresholds
 * @returns StrategySignal enriched with dark fleet metadata
 */
export function evaluateDarkFleetSignal(
  input: StrategyInput,
  userConfig?: Partial<DarkFleetConfig>,
): DarkFleetSignal {
  const config = { ...DEFAULT_DARK_FLEET_CONFIG, ...userConfig };
  const candles = input.candles;
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const pair = (input.config?.pair as string) || "BTCUSDT";

  // ── 1. BASELINE: V2 strategy signal ─────────────────────────────────────
  let baseSignal: StrategySignal;
  try {
    const strategyKey = (input.config?.engineKey as string) || "trend_follow";
    const strategy = resolveStrategy(strategyKey);
    if (strategy) {
      baseSignal = strategy.evaluate(input);
    } else {
      // Fallback to signal-generator (map engine key → UI strategy name)
      const uiKeyMap: Record<string, string> = {
        trend_follow: "trend_balansert",
        multi_signal: "multisignal_aktiv",
        dca: "dca_trygg",
        grid: "grid_bot",
      };
      const uiKey = uiKeyMap[strategyKey] || strategyKey;
      const sg = generateSignal(uiKey, closes);
      baseSignal = {
        action: sg.action.toLowerCase() as "buy" | "sell" | "hold",
        reason: sg.reason,
        positionSize: 0.1,
      };
    }
  } catch {
    // Ultimate fallback: hold
    baseSignal = { action: "hold", reason: "Dark Fleet: V2 fallback error" };
  }

  // ── 2. REGIME CLASSIFICATION ────────────────────────────────────────────
  let regime: MarketRegime = "unknown";
  let regimeConfidence = 0;
  try {
    const features = extractFeaturesFromCandles(candles);
    const classifier = new RegimeClassifier();
    const result = classifier.classify(features);
    regime = result.regime;
    regimeConfidence = result.confidence;
  } catch {
    regime = "unknown";
    regimeConfidence = 0;
  }

  // ── 3. CONFLUENT SIGNAL (simplified — no async Sonar call in sync path) ─
  // For sync evaluation we use a simplified confluence score derived from
  // technical indicators + regime bias. The full async ConfluentSignalEngine
  // (with Sonar narrative scan) is used in the async tick route wrapper.
  const confluentScore = calculateSimplifiedConfluentScore(
    baseSignal,
    regime,
    closes,
  );

  // ── 4. ENSEMBLE SCORING ─────────────────────────────────────────────────
  const weights = getWeightsByRegime(regime);

  const technicalScore =
    baseSignal.action === "buy" ? 1 : baseSignal.action === "sell" ? -1 : 0;

  const regimeBias =
    regime === "bull"
      ? 0.2 // slight buy bias in bull
      : regime === "bear"
        ? -0.2 // slight sell bias in bear
        : regime === "high-vol"
          ? -0.1 // cautious in high vol
          : 0;

  const ensembleScore =
    technicalScore * weights.technical +
    confluentScore * weights.narrative +
    regimeBias * weights.regime;

  // ── 5. DECISION ─────────────────────────────────────────────────────────
  const threshold = config.threshold;
  let finalAction: "buy" | "sell" | "hold";

  if (ensembleScore > threshold) {
    finalAction = "buy";
  } else if (ensembleScore < -threshold) {
    finalAction = "sell";
  } else {
    finalAction = "hold";
  }

  // No-trade guardrails
  // Klarpakke-fiks 2026-08-02: Grid-strategi er designet FOR volatilitet —
  // high-vol er når grid tjener mest. Mekaniske signaler (grid/simple_grid/
  // dca) skal ALDRI blokkeres av regime-guardrails.
  // De har egen katastrofe-SL (25%) og DCA-håndtering i grid-strategy.ts.
  // FIX 2026-09-03: engine-key-matching erstatter reason-streng-match som
  // aldri slo inn for DCA (buy uten reason).
  const strategyEngineKey =
    (input.config?.engineKey as string) ||
    (input.config?.strategyId as string) ||
    "trend_follow";
  const isGridSignal = isMechanicalStrategy(strategyEngineKey);

  if (!isGridSignal) {
    if (regime === "high-vol" && regimeConfidence > 0.7) {
      finalAction = "hold";
    }
    if (regime === "unknown" && regimeConfidence < 0.3) {
      finalAction = "hold";
    }
  }
  // Merk: high-vol er IKKE en grunn til å stoppe grid — det er grid sitt
  // hjemmebane. Tick sin regime-gate (evaluateRegimeGate) blokkerer allerede
  // kjøp i bekreftet crash, og grid-strategien har egen DCA + 25% katastrofe-SL.

  // Grid-signaler er mekaniske (nivå-baserte) — de skal handles uavhengig av
  // ensemble-score. Hvis grid-strategien sier kjøp på et nivå, er det et
  // limit-order-nivå som er nådd, ikke en spekulativ prediksjon.
  if (isGridSignal && baseSignal.action !== "hold") {
    finalAction = baseSignal.action;
  }

  // ── 6. POSITION SIZING ──────────────────────────────────────────────────
  let positionSize = baseSignal.positionSize ?? 0.1;
  // Reduce size in uncertain regimes
  // Klarpakke-fiks 2026-08-02: IKKE reduser grid-signaler — grid har allerede
  // egen sizing (amountPerGrid). Halvering i high-vol gjorde at grid-trades
  // falt under minOrderValue (54 NOK < 100 NOK) og aldri ble utført.
  // FIX 2026-09-03: engine-key-matching (samme isGridSignal over).
  if (!isGridSignal && (regime === "high-vol" || regime === "unknown")) {
    positionSize *= 0.5;
  }
  // Cap at max
  positionSize = Math.min(positionSize, config.maxPositionSize);

  // ── 7. BUILD SIGNAL ─────────────────────────────────────────────────────
  const reasonParts = [
    `Dark Fleet: ${regime} (${(regimeConfidence * 100).toFixed(0)}% conf)`,
    `ensemble=${ensembleScore.toFixed(2)}`,
    baseSignal.reason || "",
  ];

  return {
    action: finalAction,
    positionSize,
    reason: reasonParts.join(" | "),
    indicators: {
      ...baseSignal.indicators,
      darkFleet: true,
      regime,
      regimeConfidence,
      ensembleScore,
      baseSignal: baseSignal.action,
      confluentSignal: confluentScore.toFixed(2),
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simplified confluent score (sync, no external API calls).
 * Uses multi-timeframe alignment + momentum + volume confirmation.
 */
function calculateSimplifiedConfluentScore(
  baseSignal: StrategySignal,
  regime: MarketRegime,
  closes: number[],
): number {
  if (closes.length < 50) return 0;

  let score = 0;

  // Momentum alignment (price vs 20-period SMA)
  const recent = closes.slice(-20);
  const sma20 = recent.reduce((a, b) => a + b, 0) / recent.length;
  const currentPrice = closes[closes.length - 1];
  const momentumAlign = currentPrice > sma20 ? 1 : -1;

  // Volume trend (using price as proxy since we don't have volume here)
  // In practice, candles include volume; this is a simplified version
  const priceVelocity =
    (closes[closes.length - 1] - closes[closes.length - 10]) /
    closes[closes.length - 10];

  // Base signal alignment
  if (baseSignal.action === "buy") {
    score += 0.3;
    if (momentumAlign > 0) score += 0.2;
    if (priceVelocity > 0.02) score += 0.15;
  } else if (baseSignal.action === "sell") {
    score -= 0.3;
    if (momentumAlign < 0) score -= 0.2;
    if (priceVelocity < -0.02) score -= 0.15;
  }

  // Regime confirmation
  if (regime === "bull" && score > 0) score += 0.1;
  if (regime === "bear" && score < 0) score -= 0.1;
  if (regime === "chop") score *= 0.5; // reduce confidence in chop

  return Math.max(-1, Math.min(1, score));
}
