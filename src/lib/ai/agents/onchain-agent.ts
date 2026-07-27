/**
 * On-Chain Agent — Genererer signaler fra whale-bevegelser og exchange flows.
 *
 * Leser blockchain-data for å oppdage akkumulering/distribusjon
 * FØR det reflekteres i prisen.
 *
 * Baseline weight: 0.15
 */

import type { TradingAgent, AgentSignal, AgentFeatures, AgentState } from "./types";
import { getWhaleMovementsForSymbol, calculateWhaleSignal } from "../onchain/whale-radar";

export const onchainAgent: TradingAgent = {
  id: "onchain",
  name: "Chain Radar Agent",
  baselineWeight: 0.15,

  async run(
    symbol: string,
    _features: AgentFeatures,
    _state?: AgentState
  ): Promise<AgentSignal> {
    try {
      const movements = await getWhaleMovementsForSymbol(symbol, 24);
      const whaleSignal = calculateWhaleSignal(movements, symbol);

      // Sterk whale-akkumulering
      if (whaleSignal.trend === "bullish" && whaleSignal.significantMoves >= 2) {
        return {
          action: "buy",
          confidence: 75 + whaleSignal.significantMoves * 5,
          reasoning: `${whaleSignal.significantMoves} signifikante whale-akkumuleringer siste 24t. ${movements.length} bevegelser totalt.`,
          meta: { significantMoves: whaleSignal.significantMoves, whaleScore: whaleSignal.score },
        };
      }

      // Whale-distribusjon
      if (whaleSignal.trend === "bearish" && whaleSignal.significantMoves >= 2) {
        return {
          action: "sell",
          confidence: 70 + whaleSignal.significantMoves * 3,
          reasoning: `${whaleSignal.significantMoves} whale-distribusjoner til exchanges. Mulig salgspress.`,
          meta: { significantMoves: whaleSignal.significantMoves, whaleScore: whaleSignal.score },
        };
      }

      // Moderat signal
      if (whaleSignal.significantMoves >= 1) {
        return {
          action: whaleSignal.trend === "bullish" ? "buy" : "sell",
          confidence: 50 + Math.abs(whaleSignal.score) * 5,
          reasoning: `${whaleSignal.significantMoves} whale-bevegelser. ${movements.length} transaksjoner analysert.`,
          meta: { significantMoves: whaleSignal.significantMoves },
        };
      }

      return {
        action: "hold",
        confidence: 10,
        reasoning: `Ingen signifikante whale-bevegelser for ${symbol} siste 24t`,
      };
    } catch (error) {
      return {
        action: "hold",
        confidence: 0,
        reasoning: `On-chain agent error: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  },
};
