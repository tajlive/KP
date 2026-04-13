/**
 * Typed Supabase-hjelpere – én kilde for vanlige queries.
 * Reduserer behov for "as unknown" i kallende kode.
 * Se docs/forbedringsforslag-2026.md.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type UserProfileOnboarding = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "onboarding_step" | "onboarding_completed" | "onboarding_started_at"
>;

export type UserProfileOnboardingExtended = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  | "onboarding_step"
  | "onboarding_completed"
  | "onboarding_started_at"
  | "paper_balance"
  | "trading_experience"
  | "binance_connected"
>;

/**
 * Hent onboarding-felter for en bruker (typet uten as any i kallende kode).
 */
export async function getUserProfileOnboarding(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ data: UserProfileOnboarding | null; error: unknown }> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("onboarding_step, onboarding_completed, onboarding_started_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: data as UserProfileOnboarding | null, error: null };
}

/**
 * Hent onboarding + paper_balance, trading_experience, binance_connected (for steg 2–5).
 */
export async function getProfileOnboardingExtended(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ data: UserProfileOnboardingExtended | null; error: unknown }> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "onboarding_step, onboarding_completed, onboarding_started_at, paper_balance, trading_experience, binance_connected"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: data as UserProfileOnboardingExtended | null, error: null };
}
