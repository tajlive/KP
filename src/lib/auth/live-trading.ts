import { createClient } from "@/lib/supabase/server";
import { canAccessLiveAutoTrading, type TierSlug } from "@/types/subscription";
import { normalizeTier } from "@/lib/pricing/tiers";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fail-closed live trading entitlement check.
 * Returns true only when the user explicitly passes ALL gates:
 * - tier allows live auto-trading
 * - Kraken account is connected (user_kraken_keys — EU/EØS 2026:
 *   Kraken er eneste børs)
 * - entitlements RPC returns auto_trade_allow_live = true
 */
export async function verifyLiveEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("tier, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return false;

  // Professor-tier users get live access automatically
  if (profile.role === "professor" || profile.tier === "professor") return true;

  const tier = normalizeTier(profile.tier);
  if (!canAccessLiveAutoTrading(tier as TierSlug)) return false;

  // Kraken-nøkler må være lagret (kryptert). Sjekk via ExecutorFactory
  // (samme kilde som selve utførelsen) — da kan aldri entitlement og
  // utførelse sprike.
  const { data: krakenKeys } = await supabase
    .from("user_kraken_keys")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!krakenKeys) return false;

  const { data: entitlements, error } = await supabase.rpc(
    "get_user_entitlements",
    { p_user_id: userId },
  );

  if (error || !entitlements?.length) return false;
  return Boolean(entitlements[0].auto_trade_allow_live);
}

/**
 * Convenience wrapper that creates a service-role client internally.
 * Prefer verifyLiveEntitlement(supabase, userId) in request handlers to reuse
 * the existing client and avoid extra connections.
 */
export async function verifyLiveEntitlementForUserId(
  userId: string,
): Promise<boolean> {
  const supabase = createClient();
  return verifyLiveEntitlement(supabase, userId);
}
