/**
 * Narrative Agent — Identifiserer markedsnarrativer og deres trading-implications.
 *
 * Narrativer er "historiene" som driver markeder:
 * - "AI coins season" → kjøp TAO, FET, RNDR
 * - "Memecoin supercycle" → kjøp DOGE, WIF, BONK
 * - "RWA tokenization" → kjøp ONDO, CFG
 * - "Bitcoin ETF inflows" → bullish BTC
 * - "Layer 2 wars" → kjøp ARB, OP, MATIC
 * - "DeFi renaissance" → kjøp AAVE, UNI, MKR
 *
 * Baseline weight: 0.10
 */

import type { TradingAgent, AgentSignal, AgentFeatures, AgentState } from "./types";

type Narrative =
  | "ai_coins"
  | "memecoins"
  | "rwa_tokenization"
  | "btc_etf"
  | "layer2_wars"
  | "defi_renaissance"
  | "gaming"
  | "depin"
  | "no_narrative";

interface NarrativeScore {
  narrative: Narrative;
  strength: number; // 0-1
  symbols: string[];
  description: string;
}

/** Vurder hvilket narrativ som driver et symbol */
function detectNarrative(symbol: string): NarrativeScore {
  const s = symbol.toUpperCase();

  const aiCoins = ["TAO", "FET", "RNDR", "AGIX", "OCEAN", "WLD", "AKT"];
  const memecoins = ["DOGE", "WIF", "BONK", "PEPE", "FLOKI", "SHIB"];
  const rwa = ["ONDO", "CFG", "MKR", "AAVE", "COMP"];
  const l2 = ["ARB", "OP", "MATIC", "ZK", "STRK", "MNT", "BLAST"];
  const defi = ["UNI", "AAVE", "MKR", "CRV", "SNX", "PENDLE", "LDO"];
  const gaming = ["IMX", "GALA", "SAND", "MANA", "APE", "RON", "PRIME"];
  const depin = ["HNT", "RNDR", "AKT", "AR", "FIL", "LPT"];

  if (aiCoins.includes(s)) return { narrative: "ai_coins", strength: 0.8, symbols: aiCoins, description: "AI coins" };
  if (memecoins.includes(s)) return { narrative: "memecoins", strength: 0.7, symbols: memecoins, description: "Memecoins" };
  if (rwa.includes(s)) return { narrative: "rwa_tokenization", strength: 0.65, symbols: rwa, description: "RWA tokenization" };
  if (l2.includes(s)) return { narrative: "layer2_wars", strength: 0.6, symbols: l2, description: "Layer 2 wars" };
  if (defi.includes(s)) return { narrative: "defi_renaissance", strength: 0.55, symbols: defi, description: "DeFi renaissance" };
  if (gaming.includes(s)) return { narrative: "gaming", strength: 0.5, symbols: gaming, description: "Gaming" };
  if (depin.includes(s)) return { narrative: "depin", strength: 0.5, symbols: depin, description: "DePIN" };

  return { narrative: "no_narrative", strength: 0, symbols: [s], description: "No clear narrative" };
}

export const narrativeAgent: TradingAgent = {
  id: "narrative",
  name: "Narrative Agent",
  baselineWeight: 0.1,

  async run(
    symbol: string,
    features: AgentFeatures,
    _state?: AgentState
  ): Promise<AgentSignal> {
    const narrative = detectNarrative(symbol);

    if (narrative.narrative === "no_narrative") {
      return {
        action: "hold",
        confidence: 5,
        reasoning: `${symbol} har ikke et tydelig markedsnarrativ`,
      };
    }

    // Sterke narrativer gir høyere konfidens
    const isStrongNarrative = narrative.strength > 0.6;
    const isTrendingNarrative = ["ai_coins", "memecoins", "rwa_tokenization"].includes(narrative.narrative);

    if (isStrongNarrative && isTrendingNarrative) {
      // Trendende narrativ + momentum = kjøp
      if (features.rsi && features.rsi < 70 && features.macdHistogram && features.macdHistogram > 0) {
        return {
          action: "buy",
          confidence: Math.round(narrative.strength * 100),
          reasoning: `${narrative.description} narrativ er sterkt (${(narrative.strength * 100).toFixed(0)}%). RSI ${features.rsi.toFixed(1)} — god entry.`,
          meta: { narrative: narrative.narrative, narrativeStrength: narrative.strength },
        };
      }
    }

    if (narrative.strength > 0.5) {
      return {
        action: "buy",
        confidence: Math.round(narrative.strength * 70),
        reasoning: `${narrative.description} narrativ — ${symbol} er en del av dette segmentet.`,
        meta: { narrative: narrative.narrative, narrativeStrength: narrative.strength },
      };
    }

    return {
      action: "hold",
      confidence: 30,
      reasoning: `${narrative.description} narrativ, men ikke sterkt nok for entry`,
    };
  },
};
