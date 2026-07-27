/**
 * Regime Detector — 6 markedsregimer for smartere trading.
 *
 * Utvidelser fra dagens 3 (bull/bear/range):
 * 1. Risk-On Bull    — BTC ↑, S&P ↑, DXY ↓ → full aggressiv
 * 2. Crypto Decouple — BTC ↑ uavhengig av makro → moderat
 * 3. Risk-Off Bear   — BTC ↓, S&P ↓, DXY ↑ → defensiv
 * 4. Liquidity Crisis — VIX > 30, BTC ↓ kraftig → kun stablecoin
 * 5. Alt-Season      — BTC dominance ↓, ETH/BTC ↑ → roter til alts
 * 6. Accumulation    — lav volatilitet, whale-akkumulering → DCA
 */

import type { MacroSnapshot } from "./macro-scope";

export type MarketRegime =
  | "risk_on_bull"
  | "crypto_decoupling"
  | "risk_off_bear"
  | "liquidity_crisis"
  | "alt_season"
  | "accumulation";

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number; // 0-1
  description: string;
  recommendedExposure: number; // 0-1 (andel av kapital som bør være i markedet)
  preferredAgents: string[]; // agent IDs som presterer i dette regimet
  avoidAgents: string[]; // agent IDs som bør deaktiveres
}

/** Detekter markedsregime basert på makro + krypto-data */
export function detectRegime(snapshot: MacroSnapshot): RegimeResult {
  const { vix, dxy, sp500, btcDominance } = snapshot;

  // 4. Liquidity Crisis — VIX > 30
  if (vix > 30) {
    return {
      regime: "liquidity_crisis",
      confidence: Math.min((vix - 30) / 20, 1),
      description: "Ekstrem markedsuro — VIX over 30. Kun stablecoin eller avstå.",
      recommendedExposure: 0.1,
      preferredAgents: [], // ingen — avstå
      avoidAgents: ["trend", "momentum", "breakout", "grid"],
    };
  }

  // 5. Alt-Season — BTC dominance synker, ETH stiger
  if (btcDominance < 45) {
    return {
      regime: "alt_season",
      confidence: Math.min((45 - btcDominance) / 15, 1),
      description: "Alt-season — BTC dominance under 45%. Riktig tid for altcoins.",
      recommendedExposure: 0.7,
      preferredAgents: ["momentum", "volume", "narrative"],
      avoidAgents: ["trend"],
    };
  }

  // 3. Risk-Off Bear — S&P faller, DXY stiger
  if (sp500 < 0 && dxy > 105) {
    return {
      regime: "risk_off_bear",
      confidence: 0.7,
      description: "Risk-off bear — tradisjonelle markeder faller, dollar styrkes.",
      recommendedExposure: 0.3,
      preferredAgents: ["mean_reversion", "hurst"],
      avoidAgents: ["trend", "breakout", "momentum"],
    };
  }

  // 1. Risk-On Bull — S&P stiger, DXY faller, VIX lav
  if (sp500 > 0 && dxy < 100 && vix < 20) {
    return {
      regime: "risk_on_bull",
      confidence: 0.85,
      description: "Risk-on bull — perfekte forhold for krypto. Full eksponering.",
      recommendedExposure: 0.9,
      preferredAgents: ["trend", "momentum", "breakout", "news", "narrative"],
      avoidAgents: ["mean_reversion"],
    };
  }

  // 2. Crypto Decoupling — BTC stiger uavhengig av tradisjonelle markeder
  if (btcDominance > 50 && vix < 25) {
    return {
      regime: "crypto_decoupling",
      confidence: 0.6,
      description: "Krypto de-kobler fra tradisjonelle markeder — moderat eksponering.",
      recommendedExposure: 0.6,
      preferredAgents: ["trend", "onchain", "sentiment"],
      avoidAgents: [],
    };
  }

  // 6. Accumulation — fallback når ingen klare signaler
  return {
    regime: "accumulation",
    confidence: 0.5,
    description: "Akkumuleringsfase — lav volatilitet, bygg posisjoner gradvis.",
    recommendedExposure: 0.5,
    preferredAgents: ["grid", "dca", "hurst"],
    avoidAgents: ["momentum"],
  };
}
