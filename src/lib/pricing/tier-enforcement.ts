/**
 * Tier Enforcement Engine
 * 
 * Central module that enforces all tier-based limits.
 * Every API endpoint that changes state MUST call this before acting.
 * 
 * Usage:
 *   const enforcement = await enforceTierLimit(supabase, userId, "autoStrategies");
 *   if (!enforcement.allowed) return error(enforcement.reason);
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getTierLevel, normalizeTier } from "./tier-level";
import { TIERS, type TierSlug, type Tier } from "./tiers";

type Supa = SupabaseClient<Database>;

// ═══════════════════════════════════════════════════════
// Paper trading limits per tier (NOK)
// ═══════════════════════════════════════════════════════
const PAPER_LIMITS: Record<TierSlug, number> = {
  student: 100_000,
  bachelor: 250_000,
  master: 500_000,
  phd: 1_000_000,
  professor: Number.POSITIVE_INFINITY,
};

// ═══════════════════════════════════════════════════════
// Enforcement result
// ═══════════════════════════════════════════════════════
export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  tier?: TierSlug;
  limit?: number;
  current?: number;
}

// ═══════════════════════════════════════════════════════
// Get user's tier
// ═══════════════════════════════════════════════════════
export async function getUserTier(supabase: Supa, userId: string): Promise<TierSlug> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  return normalizeTier(profile?.subscription_tier);
}

export function getUserTierLevel(tier: string): number {
  return getTierLevel(tier);
}

// ═══════════════════════════════════════════════════════
// 1. Paper trading cap
// ═══════════════════════════════════════════════════════
export async function enforcePaperTradingCap(
  supabase: Supa,
  userId: string,
  requestedAmount?: number,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const limit = PAPER_LIMITS[tier] ?? 100_000;

  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, tier, limit };
  }

  // Check current balance
  const { data: account } = await supabase
    .from("paper_accounts")
    .select("current_balance")
    .eq("user_id", userId)
    .single();

  const current = account?.current_balance ?? 0;

  if (requestedAmount && current + requestedAmount > limit) {
    return {
      allowed: false,
      reason: `Paper trading limit for ${tier} er ${limit.toLocaleString("no")} kr. Du har ${current.toLocaleString("no")} kr.`,
      tier,
      limit,
      current,
    };
  }

  if (current > limit) {
    return {
      allowed: false,
      reason: `Du har nådd paper trading grensen for ${tier}: ${limit.toLocaleString("no")} kr. Oppgrader for mer.`,
      tier,
      limit,
      current,
    };
  }

  return { allowed: true, tier, limit, current };
}

// ═══════════════════════════════════════════════════════
// 2. Auto-strategy limit
// ═══════════════════════════════════════════════════════
export async function enforceStrategyLimit(
  supabase: Supa,
  userId: string,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const tierConfig = TIERS[tier];
  const limit = tierConfig.autoTradingStrategies; // -1 = unlimited

  if (limit === -1) {
    return { allowed: true, tier, limit: Number.POSITIVE_INFINITY };
  }

  const { count } = await supabase
    .from("user_strategies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const current = count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Du har nådd grensen på ${limit} strategier for ${tier}. Oppgrader for flere.`,
      tier,
      limit,
      current,
    };
  }

  return { allowed: true, tier, limit, current };
}

// ═══════════════════════════════════════════════════════
// 3. Copy-trading cap
// ═══════════════════════════════════════════════════════
export async function enforceCopyTradingCap(
  supabase: Supa,
  userId: string,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const tierConfig = TIERS[tier];

  if (!tierConfig.canCopyTraders) {
    return {
      allowed: false,
      reason: `Copy-trading krever minimum Bachelor (249 kr/mnd).`,
      tier,
    };
  }

  // Student: max 2 leaders, Bachelor+: unlimited
  const maxLeaders = tier === "student" ? 2 : Number.POSITIVE_INFINITY;

  if (maxLeaders === Number.POSITIVE_INFINITY) {
    return { allowed: true, tier, limit: maxLeaders };
  }

  const { count } = await supabase
    .from("copy_trading_follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId)
    .eq("is_active", true);

  const current = count ?? 0;

  if (current >= maxLeaders) {
    return {
      allowed: false,
      reason: `Student kan følge maks ${maxLeaders} tradere. Oppgrader til Bachelor for ubegrenset.`,
      tier,
      limit: maxLeaders,
      current,
    };
  }

  return { allowed: true, tier, limit: maxLeaders, current };
}

// ═══════════════════════════════════════════════════════
// 4. VIP signal access
// ═══════════════════════════════════════════════════════
export async function enforceVipSignalAccess(
  supabase: Supa,
  userId: string,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const tierConfig = TIERS[tier];

  return {
    allowed: tierConfig.canUseLiveSignals,
    reason: tierConfig.canUseLiveSignals
      ? undefined
      : `VIP-signaler krever minimum Master (499 kr/mnd).`,
    tier,
  };
}

// ═══════════════════════════════════════════════════════
// 5. Backtest limit
// ═══════════════════════════════════════════════════════
export async function enforceBacktestLimit(
  supabase: Supa,
  userId: string,
  requestedDays: number,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const tierConfig = TIERS[tier];
  const limit = tierConfig.maxBacktestDays; // -1 = unlimited

  if (limit === -1) {
    return { allowed: true, tier, limit: Number.POSITIVE_INFINITY };
  }

  if (requestedDays > limit) {
    return {
      allowed: false,
      reason: `Backtesting for ${tier} er begrenset til ${limit} dager. Oppgrader for mer.`,
      tier,
      limit,
      current: requestedDays,
    };
  }

  return { allowed: true, tier, limit };
}

// ═══════════════════════════════════════════════════════
// 6. Live trading access
// ═══════════════════════════════════════════════════════
export async function enforceLiveTradingAccess(
  supabase: Supa,
  userId: string,
): Promise<EnforcementResult> {
  const tier = await getUserTier(supabase, userId);
  const tierConfig = TIERS[tier];

  return {
    allowed: tierConfig.liveTrading,
    reason: tierConfig.liveTrading
      ? undefined
      : `Live trading krever minimum Bachelor (249 kr/mnd).`,
    tier,
  };
}

// ═══════════════════════════════════════════════════════
// Bulk enforcement — check all limits at once
// ═══════════════════════════════════════════════════════
export type EnforcementType =
  | "paperTrading"
  | "autoStrategies"
  | "copyTrading"
  | "vipSignals"
  | "backtest"
  | "liveTrading";

const ENFORCERS: Record<EnforcementType, (supabase: Supa, userId: string, extra?: unknown) => Promise<EnforcementResult>> = {
  paperTrading: (s, u, extra) => enforcePaperTradingCap(s, u, extra as number),
  autoStrategies: (s, u) => enforceStrategyLimit(s, u),
  copyTrading: (s, u) => enforceCopyTradingCap(s, u),
  vipSignals: (s, u) => enforceVipSignalAccess(s, u),
  backtest: (s, u, extra) => enforceBacktestLimit(s, u, extra as number),
  liveTrading: (s, u) => enforceLiveTradingAccess(s, u),
};

export async function enforceTierLimit(
  supabase: Supa,
  userId: string,
  type: EnforcementType,
  extra?: unknown,
): Promise<EnforcementResult> {
  const enforcer = ENFORCERS[type];
  if (!enforcer) return { allowed: false, reason: `Unknown enforcement type: ${type}` };
  return enforcer(supabase, userId, extra);
}
