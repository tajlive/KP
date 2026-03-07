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

import { createClient } from "@/lib/supabase/server";
import { BinanceExecutor } from "./binance-executor";
import type { OrderExecutor } from "./order-executor";
import { PaperExecutor } from "./paper-executor";

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
    userId: string,
    mode: "paper" | "live",
    sessionId?: string,
  ): Promise<OrderExecutor> {
    if (mode === "paper") {
      return new PaperExecutor(userId, sessionId);
    }

    // Live mode: fetch and decrypt Binance API keys
    const supabase = createClient();

    // Get user's tier (validate live trading access)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        "tier, binance_connected, binance_api_key_id, binance_api_secret_id",
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    // Check tier requirements (matching canAccessLiveAutoTrading in subscription.ts)
    const allowedTiers = ["bachelor", "master", "phd", "professor"] as const;
    if (!allowedTiers.includes(profile.tier as typeof allowedTiers[number])) {
      throw new Error("Live trading requires Bachelor tier or higher");
    }

    // Check Binance connection
    if (!profile.binance_connected) {
      throw new Error(
        "Binance API keys not configured. Please connect your exchange first.",
      );
    }

    // Decrypt API keys using RPC function
    const { data: decryptedKeys, error } = await supabase.rpc(
      "decrypt_binance_keys",
      {
        key_id: profile.binance_api_key_id,
        secret_id: profile.binance_api_secret_id,
      },
    );

    if (error || !decryptedKeys || !Array.isArray(decryptedKeys) || decryptedKeys.length === 0) {
      console.error("Failed to decrypt Binance keys:", error);
      throw new Error(
        "Failed to retrieve API keys. Please reconnect your exchange.",
      );
    }

    const keys = decryptedKeys[0] as { api_key: string; api_secret: string; is_testnet?: boolean };

    // Create BinanceExecutor
    return new BinanceExecutor({
      apiKey: keys.api_key,
      apiSecret: keys.api_secret,
      testnet: keys.is_testnet || false,
    });
  }

  /**
   * Create an OrderExecutor from a session ID
   * Automatically determines mode from the session
   *
   * @param sessionId - Trading session ID
   * @returns OrderExecutor instance
   */
  static async createFromSession(sessionId: string): Promise<OrderExecutor> {
    const supabase = createClient();

    const { data: session, error } = await supabase
      .from("trading_sessions")
      .select("user_id, mode")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      throw new Error("Trading session not found");
    }

    const mode = session.mode as "paper" | "live";
    return this.create(session.user_id, mode, sessionId);
  }

  /**
   * Validate that a user can access live trading
   *
   * @param userId - User ID
   * @returns true if user can trade live
   */
  static async canTradeLive(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier, binance_connected")
      .eq("id", userId)
      .single();

    if (!profile) {
      return false;
    }

    return (
      ["bachelor", "master", "phd", "professor"].includes(profile.tier) &&
      profile.binance_connected
    );
  }
}
