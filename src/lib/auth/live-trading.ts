import { createClient } from "@/lib/supabase/server";
import { canAccessLiveAutoTrading, type TierSlug } from "@/types/subscription";
import { normalizeTier } from "@/lib/pricing/tiers";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canUserAccessLiveTrading } from "./live-trading-dogfood";

/**
 * Fail-closed live trading entitlement check.
 * SJEKKEREKKEFØLGE (2026-08-12, P0 dogfood):
 * 1. Dogfood-gate — kun whitelistede brukere (Tom) får tilgang
 * 2. Tier — riktig abonnementsnivå
 * 3. Exchange-nøkler — Kraken (user_kraken_keys) ELLER OKX (user_okx_keys)
 * 4. Entitlements RPC — auto_trade_allow_live = true
 *
 * Returnerer true kun når ALLE gater passerer.
 */
export async function verifyLiveEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  // ── Gate 0: Dogfood-whitelist (2026-08-12, P0) ──────────────────
  if (!canUserAccessLiveTrading(userId)) return false;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("tier, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return false;

  // Founder-loven (2026-08-08): de 100 første får gratis tilgang for livet —
  // founder-rolle = full tilgang (samme som professor).
  if (profile.role === "founder") return true;

  // Professor-tier users get live access automatically
  if (profile.role === "professor" || profile.tier === "professor") return true;

  const tier = normalizeTier(profile.tier);
  if (!canAccessLiveAutoTrading(tier as TierSlug)) return false;

  // Kraken- eller OKX-nøkler må være lagret (kryptert).
  // 2026-08-12: OKX er primær live-børs (Kraken-nøkkel død for Tom).
  // Sjekk begge — brukeren trenger kun én aktiv exchange.
  const [{ data: krakenKeys }, { data: okxKeys }] = await Promise.all([
    supabase
      .from("user_kraken_keys")
      .select("user_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("user_okx_keys")
      .select("user_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!krakenKeys && !okxKeys) return false;

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
