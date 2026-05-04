/**
 * Tick Rollout — Lightweight Champion/Challenger for the tick engine
 *
 * Stateless, deterministic user-ID hashing for traffic splitting.
 * Records trade outcomes to trading_logs for metric aggregation.
 */

import { createHash } from "crypto";

export type TradeVersion = "champion" | "challenger";

export interface RolloutConfig {
  /** 0-100, percentage of users getting Dark Fleet (challenger) */
  challengerPercent: number;
  /** Salt for deterministic hashing */
  salt: string;
  /** Minimum trades before evaluating metrics */
  minTradesForEvaluation: number;
}

export const DEFAULT_TICK_ROLLOUT_CONFIG: RolloutConfig = {
  challengerPercent: parseFloat(process.env.DARK_FLEET_CHALLENGER_PERCENT || "0"),
  salt: process.env.DARK_FLEET_ROLLOUT_SALT || "klarpakke-dark-fleet-2026",
  minTradesForEvaluation: 20,
};

/**
 * Hash user ID to a deterministic 0-1 value.
 * Same user always gets same bucket across restarts.
 */
export function hashUserIdToBucket(userId: string, salt: string): number {
  const hash = createHash("sha256").update(userId + salt).digest("hex");
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

/**
 * Decide if a user should get Dark Fleet (challenger) or V2 (champion).
 */
export function shouldUseChallenger(
  userId: string,
  config: RolloutConfig = DEFAULT_TICK_ROLLOUT_CONFIG,
): { version: TradeVersion; reason: string } {
  if (config.challengerPercent <= 0) {
    return { version: "champion", reason: "Rollout disabled (0%)" };
  }
  if (config.challengerPercent >= 100) {
    return { version: "challenger", reason: "Full rollout (100%)" };
  }

  const bucket = hashUserIdToBucket(userId, config.salt);
  const useChallenger = bucket < config.challengerPercent / 100;

  return {
    version: useChallenger ? "challenger" : "champion",
    reason: useChallenger
      ? `Challenger (${(bucket * 100).toFixed(2)}% < ${config.challengerPercent}%)`
      : `Champion (${(bucket * 100).toFixed(2)}% ≥ ${config.challengerPercent}%)`,
  };
}

/**
 * Build a dark fleet config based on rollout decision.
 * Returns undefined if user is champion (V2 only).
 */
export function getDarkFleetConfigForUser(
  userId: string,
  baseConfig: { enabled: boolean; maxPositionSize: number; threshold: number },
): { enabled: boolean; maxPositionSize: number; threshold: number } | undefined {
  if (!baseConfig.enabled) return undefined;

  const decision = shouldUseChallenger(userId);
  if (decision.version === "champion") {
    return undefined; // User gets V2, no dark fleet
  }

  return baseConfig;
}

/**
 * Record which version was used for a trade.
 * Stored in trading_logs for later aggregation.
 */
export interface TradeVersionRecord {
  session_id: string;
  user_id: string;
  trade_id?: string;
  version: TradeVersion;
  action: "buy" | "sell" | "hold" | "risk_blocked";
  pnl?: number;
  regime?: string;
  ensemble_score?: number;
}
