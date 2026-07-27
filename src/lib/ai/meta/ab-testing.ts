/**
 * A/B Testing Engine — Kjører parallelle strategi-varianter og måler P&L.
 *
 * Hver strategi er en unik kombinasjon av agents + vekter + risk level.
 * Paper accounts brukes til å måle faktisk performance uten risiko.
 */

import type { TradingAgent } from "../agents/types";

export interface StrategyVariant {
  id: string;
  name: string;
  agents: string[]; // agent IDs
  weights: Record<string, number>; // per-agent vekting (0-1, sum = 1)
  riskLevel: "low" | "medium" | "high";
  // Performance metrics (updated daily)
  pnl30d: number;
  pnl7d: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  active: boolean;
}

/** Definer strategi-varianter for A/B-testing */
export function createStrategyVariants(agents: TradingAgent[]): StrategyVariant[] {
  const allAgentIds = agents.map((a) => a.id);

  return [
    {
      id: "crypto_pilot_full",
      name: "CryptoPilot Full Ensemble",
      agents: allAgentIds,
      weights: calculateEqualWeights(allAgentIds),
      riskLevel: "medium",
      pnl30d: 0, pnl7d: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      active: true,
    },
    {
      id: "ta_only",
      name: "Technical Analysis Only",
      agents: ["trend", "mean_reversion", "breakout", "momentum", "volume"],
      weights: calculateEqualWeights(["trend", "mean_reversion", "breakout", "momentum", "volume"]),
      riskLevel: "medium",
      pnl30d: 0, pnl7d: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      active: true,
    },
    {
      id: "ai_augmented",
      name: "TA + News + On-chain",
      agents: ["trend", "momentum", "news", "onchain", "sentiment"],
      weights: { trend: 0.25, momentum: 0.2, news: 0.2, onchain: 0.2, sentiment: 0.15 },
      riskLevel: "medium",
      pnl30d: 0, pnl7d: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      active: true,
    },
    {
      id: "conservative",
      name: "Conservative (Grid + DCA)",
      agents: ["grid", "hurst", "onchain"],
      weights: { grid: 0.4, hurst: 0.3, onchain: 0.3 },
      riskLevel: "low",
      pnl30d: 0, pnl7d: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0,
      active: true,
    },
  ];
}

function calculateEqualWeights(agentIds: string[]): Record<string, number> {
  const weight = 1 / agentIds.length;
  return Object.fromEntries(agentIds.map((id) => [id, weight]));
}

/** Velg beste strategi basert på Sharpe ratio */
export function selectBestStrategy(variants: StrategyVariant[]): StrategyVariant {
  return variants
    .filter((v) => v.active && v.totalTrades >= 10)
    .sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0] ?? variants[0];
}

/** Vektet ensemble-signal fra flere strategier */
export function ensembleVote(
  variants: StrategyVariant[],
  signals: Map<string, { action: string; confidence: number }>
): { action: string; confidence: number; contributors: number } {
  let buyWeight = 0;
  let sellWeight = 0;
  let totalWeight = 0;
  let contributors = 0;

  for (const variant of variants) {
    if (!variant.active) continue;
    const signal = signals.get(variant.id);
    if (!signal || signal.confidence < 30) continue;

    const weight = variant.sharpeRatio > 0 ? variant.sharpeRatio : variant.winRate;
    const effectiveWeight = Math.max(weight, 0.1);

    if (signal.action === "buy") buyWeight += effectiveWeight;
    if (signal.action === "sell") sellWeight += effectiveWeight;
    totalWeight += effectiveWeight;
    contributors++;
  }

  if (contributors === 0 || totalWeight === 0) {
    return { action: "hold", confidence: 0, contributors: 0 };
  }

  const buyRatio = buyWeight / totalWeight;

  if (buyRatio > 0.6) {
    return { action: "buy", confidence: Math.round(buyRatio * 100), contributors };
  } else if (buyRatio < 0.4) {
    return { action: "sell", confidence: Math.round((1 - buyRatio) * 100), contributors };
  }

  return { action: "hold", confidence: 50, contributors };
}
