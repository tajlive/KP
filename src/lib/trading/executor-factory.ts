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
import { OkxExecutor } from "./okx-executor";

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

    // Live mode — EU/EØS-fakta (2026): Kraken og OKX er begge MiCA-regulert.
    // Kraken har prioritet — OKX brukes kun hvis brukeren ikke har aktiv Kraken.
    const krakenExecutor = await KrakenExecutor.fromUser(supabase, userId);
    if (krakenExecutor) {
      return krakenExecutor;
    }

    // OKX er børs #2 — OKX_ENABLED må være "true" i miljøet.
    // Tom sin konto (2026-08-11): Kraken-nøkkel revokert → OKX er aktiv børs.
    const okxEnabled = process.env.OKX_ENABLED === "true";
    if (okxEnabled) {
      const okxExecutor = await OkxExecutor.fromUser(supabase, userId);
      if (okxExecutor) {
        return okxExecutor;
      }
    }

    throw new Error(
      "No exchange keys configured. Please connect your exchange first.",
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

    // EU/EØS (2026): Kraken ELLER OKX-nøkler teller for live-tilgang.
    const { data: krakenKeys } = await supabase
      .from("user_kraken_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const okxEnabled = process.env.OKX_ENABLED === "true";
    let okxKeys: { id: string } | null = null;
    if (okxEnabled) {
      const { data } = await supabase
        .from("user_okx_keys")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      okxKeys = data;
    }

    return tierOk && Boolean(krakenKeys || okxKeys);
  }
}
