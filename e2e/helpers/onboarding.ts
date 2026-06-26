/**
 * Onboarding test helpers
 *
 * Utilities for resetting a test user's onboarding state so the 5-step
 * onboarding flow can be exercised repeatedly in E2E tests.
 */

import { createClient } from "@supabase/supabase-js";

function getSupabaseServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error(
      "Onboarding reset helper: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Find the Supabase auth user id for an e-mail address.
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return data.users.find((u) => u.email === email)?.id ?? null;
}

/**
 * Reset onboarding state for a user so the 5-step onboarding flow can be
 * replayed. This also wipes paper trades and recreates a clean paper trading
 * session, because step 4's RPC requires an active paper session.
 */
export async function resetOnboardingState(userId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  // 1. Reset profile onboarding fields and give the user a fresh paper balance.
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      onboarding_step: 0,
      onboarding_completed: false,
      onboarding_started_at: null,
      onboarding_completed_at: null,
      trading_experience: null,
      paper_balance: 100_000,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to reset user profile: ${profileError.message}`);
  }

  // 2. Wipe any trades created during previous onboarding runs.
  const { error: tradesError } = await supabase
    .from("trades")
    .delete()
    .eq("user_id", userId)
    .eq("mode", "paper");

  if (tradesError) {
    throw new Error(`Failed to delete paper trades: ${tradesError.message}`);
  }

  // Legacy paper_trades table may also contain rows from earlier flows.
  const { error: legacyTradesError } = await supabase
    .from("paper_trades")
    .delete()
    .eq("user_id", userId);

  if (legacyTradesError) {
    throw new Error(
      `Failed to delete legacy paper trades: ${legacyTradesError.message}`,
    );
  }

  // 3. Remove existing trading sessions and recreate a single active paper
  //    session with the default starting capital.
  const { error: sessionsError } = await supabase
    .from("trading_sessions")
    .delete()
    .eq("user_id", userId);

  if (sessionsError) {
    throw new Error(
      `Failed to delete trading sessions: ${sessionsError.message}`,
    );
  }

  const now = new Date().toISOString();
  const { error: insertSessionError } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: userId,
      mode: "paper",
      status: "active",
      strategy_id: "dca",
      trading_pair: "BTCUSDT",
      current_capital_nok: 100_000,
      starting_capital_nok: 100_000,
      initial_capital: 100_000,
      current_capital: 100_000,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl: 0,
      started_at: now,
      created_at: now,
      updated_at: now,
    });

  if (insertSessionError) {
    throw new Error(
      `Failed to recreate paper session: ${insertSessionError.message}`,
    );
  }
}
