/**
 * AutoHeal — Selvhelbredende agent som lærer av egne feil.
 *
 * Kjernemekanismen:
 * 1. Klassifiser tapende handler i 10 feilkategorier
 * 2. Auto-korriger strategiparametere basert på feilmønster
 * 3. Deaktiver agenter i regimer der de presterer dårlig
 * 4. Prediker feil FØR nye handler basert på historisk data
 */

import type { MarketRegime } from "../macro/regime-detector";
import type { NewsItem } from "../news/news-pulse";
import type { WhaleMovement } from "../onchain/whale-radar";

export type MistakeCategory =
  | "entry_too_early"
  | "entry_too_late"
  | "exit_too_early"
  | "exit_too_late"
  | "stop_loss_too_tight"
  | "stop_loss_too_wide"
  | "position_too_large"
  | "position_too_small"
  | "wrong_regime"
  | "signal_false_positive";

export interface TradeMistake {
  tradeId: string;
  userId: string;
  symbol: string;
  agentId: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  exitReason: string;
  category: MistakeCategory;
  confidence: number;
  context: {
    regime: MarketRegime;
    volatility: number;
    rsiEntry: number;
    newsAtEntry: NewsItem[];
    whaleActivity: WhaleMovement[];
  };
  timestamp: Date;
}

export interface HealingAction {
  type: "adjust_stop_loss" | "adjust_position_size" | "adjust_entry_timing" |
        "disable_agent_in_regime" | "adjust_confidence_threshold" | "adjust_take_profit";
  agentId: string;
  userId: string;
  oldValue: number;
  newValue: number;
  reason: string;
  appliedAt: Date;
}

/** Klassifiser en tapende trade */
export function classifyMistake(
  trade: { pnl: number; pnlPct: number; exitReason: string; entryPrice: number; exitPrice: number },
  priceAfter1h: number,
  priceAfter4h: number,
  priceAfter1d: number
): MistakeCategory {
  if (trade.pnl >= 0) throw new Error("Only losing trades should be classified");

  // Entry too early: kjøpte → falt >5% innen 1t → steg >3% etter 4t
  if (
    priceAfter1h < trade.entryPrice * 0.95 &&
    priceAfter4h > trade.entryPrice * 1.03
  ) {
    return "entry_too_early";
  }

  // Entry too late: kjøpte → steg <1% → falt >5% etter 4t
  if (
    priceAfter1h > trade.entryPrice * 0.99 &&
    priceAfter4h < trade.entryPrice * 0.95
  ) {
    return "entry_too_late";
  }

  // Stop loss too tight: stoppet ut → prisen steg etterpå
  if (
    trade.exitReason === "stop_loss" &&
    priceAfter1d > trade.entryPrice
  ) {
    return "stop_loss_too_tight";
  }

  // Stop loss too wide: stort tap, men exit-reason var ikke stop-loss
  if (
    trade.exitReason === "stop_loss" &&
    Math.abs(trade.pnlPct) > 15
  ) {
    return "stop_loss_too_wide";
  }

  // Exit too early: solgt → steg >5% etter 1 dag
  if (
    trade.exitReason !== "stop_loss" &&
    priceAfter1d > trade.exitPrice * 1.05
  ) {
    return "exit_too_early";
  }

  // Exit too late: holdt → pris falt >5% fra peak
  if (
    trade.exitReason !== "stop_loss" &&
    priceAfter4h > trade.exitPrice * 1.05 &&
    priceAfter1d < trade.exitPrice
  ) {
    return "exit_too_late";
  }

  // Position too large: tap >20%
  if (Math.abs(trade.pnlPct) > 20) {
    return "position_too_large";
  }

  // Position too small: tap men veldig liten
  if (Math.abs(trade.pnlPct) < 1 && trade.exitReason !== "stop_loss") {
    return "position_too_small";
  }

  return "signal_false_positive";
}

/** Auto-helbred basert på feilkategori */
export function autoHeal(mistake: { category: MistakeCategory; agentId: string; userId: string; symbol: string; pnlPct: number }): HealingAction {
  switch (mistake.category) {
    case "stop_loss_too_tight": {
      const oldPct = 3; // default 3%
      const newPct = oldPct * 1.2;
      return {
        type: "adjust_stop_loss",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: oldPct,
        newValue: newPct,
        reason: `Stop-loss for trang for ${mistake.agentId} på ${mistake.symbol} — øker fra ${oldPct}% til ${newPct.toFixed(1)}%`,
        appliedAt: new Date(),
      };
    }
    case "stop_loss_too_wide": {
      const oldPct = 10;
      const newPct = oldPct * 0.8;
      return {
        type: "adjust_stop_loss",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: oldPct,
        newValue: newPct,
        reason: `Stop-loss for bred — tap ${mistake.pnlPct.toFixed(1)}%. Reduserer fra ${oldPct}% til ${newPct.toFixed(1)}%`,
        appliedAt: new Date(),
      };
    }
    case "position_too_large": {
      const oldSize = 100;
      const newSize = oldSize * 0.7;
      return {
        type: "adjust_position_size",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: oldSize,
        newValue: newSize,
        reason: `Posisjon for stor — ${mistake.pnlPct.toFixed(1)}% tap. Reduserer 30%`,
        appliedAt: new Date(),
      };
    }
    case "entry_too_early": {
      return {
        type: "adjust_entry_timing",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: 0,
        newValue: 300_000,
        reason: `Entry for tidlig på ${mistake.symbol} — legger til 5 min ventetid`,
        appliedAt: new Date(),
      };
    }
    case "signal_false_positive": {
      return {
        type: "adjust_confidence_threshold",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: 40,
        newValue: 55,
        reason: `${mistake.agentId} gir falske positive signaler — øker confidence-threshold`,
        appliedAt: new Date(),
      };
    }
    default: {
      return {
        type: "adjust_confidence_threshold",
        agentId: mistake.agentId,
        userId: mistake.userId,
        oldValue: 40,
        newValue: 45,
        reason: `Generell feilreduksjon for ${mistake.agentId}`,
        appliedAt: new Date(),
      };
    }
  }
}
