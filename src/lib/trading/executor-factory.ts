/**
 * Executor Factory
 *
 * Creates the appropriate OrderExecutor based on trading mode.
 * This is the key abstraction that allows strategies and API routes
 * to work identically in paper and live mode.
 *
 * Usage:
 *   const executor = await ExecutorFactory.create(userId, 'paper');
 *   const result = await executor.executeOrder({ ... });
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderExecutor } from "./order-executor";
import { PaperExecutor } from "./paper-executor";
import { KrakenExecutor } from "./kraken-executor";

export class ExecutorFactory {
  /**
   * Create an OrderExecutor for the specified mode
   *
   * @param userId - User ID
   * @param mode - Trading mode ('paper' or 'live')
   * @param sessionId - Optional session ID (if not provided, finds active session)
   * @returns OrderExecutor instance
   */
  static async create(
    supabase: SupabaseClient,
    userId: string,
    mode: "paper" | "live",
    sessionId?: string,
  ): Promise<OrderExecutor> {
    if (mode === "paper") {
      return new PaperExecutor(supabase, userId, sessionId);
    }

    // Live mode — EU/EØS-fakta (2026): Binance er geo-blokkert for norske
    // brukere (MiCA). Kraken er MiCA-regulert og Klarpakkes ENESTE live-børs.
    const krakenExecutor = await KrakenExecutor.fromUser(supabase, userId);
    if (krakenExecutor) {
      return krakenExecutor;
    }

    throw new Error(
      "Kraken API keys not configured. Please connect your exchange first.",
    );
  }

  /**
   * Create an OrderExecutor from a session ID
   * Automatically determines mode from the session
   *
   * @param sessionId - Trading session ID
   * @returns OrderExecutor instance
   */
  static async createFromSession(supabase: SupabaseClient, sessionId: string): Promise<OrderExecutor> {

    const { data: session, error } = await supabase
      .from("trading_sessions")
      .select("user_id, mode")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      throw new Error("Trading session not found");
    }

    const mode = session.mode as "paper" | "live";
    return this.create(supabase, session.user_id, mode, sessionId);
  }

  /**
   * Validate that a user can access live trading
   *
   * @param userId - User ID
   * @returns true if user can trade live
   */
  static async canTradeLive(supabase: SupabaseClient, userId: string): Promise<boolean> {

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", userId)
      .single();

    if (!profile) {
      return false;
    }

    const tierOk = ["bachelor", "master", "phd", "professor"].includes(profile.tier);

    // EU/EØS (2026): kun Kraken-nøkler teller (Binance er geo-blokkert).
    const { data: krakenKeys } = await supabase
      .from("user_kraken_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return tierOk && Boolean(krakenKeys);
  }
}
