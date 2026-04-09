/**
 * Phase Progression System
 * Manages the 4-phase progression: paper → micro → small → full
 * Users must complete 30 days + be profitable to advance
 */

import type {
  TradingPhase,
  PhaseProgressionStatus,
  UserAutoTradingConfig,
  AutoTradingSession,
} from "./types";
import { updateUserConfig } from "./supabase";
import { getTierLevel, normalizeTier } from "@/lib/pricing/tiers";

// Phase configuration
const PHASE_CONFIG = {
  paper: {
    name: "Paper Trading",
    min_days: 30,
    capital_allocation_pct: 0, // Paper trading only
    next_phase: "micro" as TradingPhase,
    description: "Practice with virtual money. Must be profitable for 30 days.",
  },
  micro: {
    name: "Micro Capital",
    min_days: 30,
    capital_allocation_pct: 1, // 1% of capital
    next_phase: "small" as TradingPhase,
    description: "Trade with 1% of your capital. Build confidence.",
  },
  small: {
    name: "Small Capital",
    min_days: 60,
    capital_allocation_pct: 5, // 5% of capital
    next_phase: "full" as TradingPhase,
    description: "Trade with 5% of your capital. Prove consistency.",
  },
  full: {
    name: "Full Capital",
    min_days: 0,
    capital_allocation_pct: 100, // 100% of capital
    next_phase: undefined,
    description: "Trade with 100% of your allocated capital.",
  },
};

// ============================================================
// PHASE STATUS
// ============================================================

export function getPhaseStatus(
  config: UserAutoTradingConfig,
  session: AutoTradingSession,
): PhaseProgressionStatus {
  const currentPhase = config.phase;
  const phaseConfig = PHASE_CONFIG[currentPhase];

  // Calculate days in current phase
  const phaseStartDate = new Date(config.phase_started_at);
  const now = new Date();
  const daysInPhase = Math.floor(
    (now.getTime() - phaseStartDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const daysRequired = config.phase_min_days;
  const isProfitable = config.phase_profitable;

  // Check if user can advance
  const hasMetDayRequirement = daysInPhase >= daysRequired;
  const canAdvance =
    hasMetDayRequirement &&
    isProfitable &&
    phaseConfig.next_phase !== undefined;

  let reason: string | undefined;
  if (!canAdvance) {
    if (!hasMetDayRequirement) {
      reason = `Need ${daysRequired - daysInPhase} more days in ${phaseConfig.name}`;
    } else if (!isProfitable) {
      reason = `Must be profitable in ${phaseConfig.name} to advance`;
    } else if (!phaseConfig.next_phase) {
      reason = "Already in final phase";
    }
  }

  return {
    current_phase: currentPhase,
    days_in_phase: daysInPhase,
    days_required: daysRequired,
    is_profitable: isProfitable,
    can_advance: canAdvance,
    next_phase: phaseConfig.next_phase,
    reason,
  };
}

// ============================================================
// PHASE ADVANCEMENT
// ============================================================

export async function advancePhase(
  userId: string,
  config: UserAutoTradingConfig,
  session: AutoTradingSession,
): Promise<{ success: boolean; new_phase?: TradingPhase; message: string }> {
  const status = getPhaseStatus(config, session);

  if (!status.can_advance) {
    return {
      success: false,
      message: status.reason || "Cannot advance phase",
    };
  }

  const nextPhase = status.next_phase!;
  const nextPhaseConfig = PHASE_CONFIG[nextPhase];

  // Update user config
  const updated = await updateUserConfig(userId, {
    phase: nextPhase,
    phase_started_at: new Date().toISOString(),
    phase_min_days: nextPhaseConfig.min_days,
    phase_profitable: false, // Reset profitability check for new phase
    allocated_capital_pct: nextPhaseConfig.capital_allocation_pct,
    is_paper_trading: nextPhase === "paper", // Only paper phase is paper trading
  });

  if (!updated) {
    return {
      success: false,
      message: "Failed to update configuration",
    };
  }

  return {
    success: true,
    new_phase: nextPhase,
    message: `Advanced to ${nextPhaseConfig.name}! Now trading with ${nextPhaseConfig.capital_allocation_pct}% of capital.`,
  };
}

// ============================================================
// PROFITABILITY CHECK
// ============================================================

export function checkProfitability(session: AutoTradingSession): boolean {
  // A session is profitable if total P&L is positive
  return session.total_pnl_nok > 0 && session.total_pnl_pct > 0;
}

export async function updateProfitabilityStatus(
  userId: string,
  config: UserAutoTradingConfig,
  session: AutoTradingSession,
): Promise<void> {
  const isProfitable = checkProfitability(session);

  // Only update if status changed
  if (config.phase_profitable !== isProfitable) {
    await updateUserConfig(userId, {
      phase_profitable: isProfitable,
    });
  }
}

// ============================================================
// CAPITAL ALLOCATION
// ============================================================

export function getAvailableCapital(
  config: UserAutoTradingConfig,
  session: AutoTradingSession,
): number {
  const tradingCapital = config.trading_capital_nok;
  const allocatedPct = config.allocated_capital_pct;

  // Calculate available capital based on phase allocation
  const availableCapital = (tradingCapital * allocatedPct) / 100;

  // Use current session capital (which may be higher/lower due to profits/losses)
  return session.current_capital_nok;
}

// ============================================================
// PHASE INFO
// ============================================================

export function getPhaseInfo(phase: TradingPhase) {
  return PHASE_CONFIG[phase];
}

export function getAllPhases() {
  return PHASE_CONFIG;
}

// ============================================================
// VALIDATION
// ============================================================

/** Legacy display names → tier slug (én kilde: @/lib/pricing/tiers) */
const LEGACY_TIER_MAP: { [key: string]: string } = {
  Komplett: "master",
  Pro: "phd",
};

export function canEnableLiveTrading(
  config: UserAutoTradingConfig,
  userSubscriptionTier: string,
): { allowed: boolean; reason?: string } {
  const slug =
    LEGACY_TIER_MAP[userSubscriptionTier] ??
    normalizeTier(userSubscriptionTier);
  const level = getTierLevel(slug);
  const minLevel = getTierLevel("master");
  if (level < minLevel) {
    return {
      allowed: false,
      reason: "Live trading requires Master tier or higher",
    };
  }

  // Check if user has completed paper trading phase
  if (config.phase === "paper") {
    return {
      allowed: false,
      reason: "Must complete 30-day paper trading phase first",
    };
  }

  // Check if paper trading was profitable
  const status = getPhaseStatus(config, {} as AutoTradingSession);
  if (!status.is_profitable) {
    return {
      allowed: false,
      reason:
        "Must be profitable in paper trading before enabling live trading",
    };
  }

  return { allowed: true };
}

// ============================================================
// PHASE RESET
// ============================================================

export async function resetToPhase(
  userId: string,
  targetPhase: TradingPhase,
): Promise<boolean> {
  const phaseConfig = PHASE_CONFIG[targetPhase];

  const updated = await updateUserConfig(userId, {
    phase: targetPhase,
    phase_started_at: new Date().toISOString(),
    phase_min_days: phaseConfig.min_days,
    phase_profitable: false,
    allocated_capital_pct: phaseConfig.capital_allocation_pct,
    is_paper_trading: targetPhase === "paper",
    is_enabled: false, // Disable auto-trading when resetting
  });

  return updated;
}
