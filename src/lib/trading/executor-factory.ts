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
import { BinanceExecutor } from "./binance-executor";
import { BinanceProxyExecutor } from "./binance-proxy-executor";
import type { OrderExecutor } from "./order-executor";
import { PaperExecutor } from "./paper-executor";
import { decryptExchangeSecret } from "@/lib/exchanges/secret-crypto";

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

    // Live mode: fetch and decrypt Binance API keys
    // Kilde-prioritet: 1) exchange_connections (ny kanonisk, BYO-UI),
    //                  2) user_profiles.binance_api_key_id (legacy)

    // 1) NY KANONISK KILDE: exchange_connections (kryptert med EXCHANGE_ENCRYPTION_SECRET)
    const { data: exchangeConn } = await supabase
      .from("exchange_connections")
      .select("api_key, api_secret_ciphertext, api_secret_nonce, is_testnet, is_active")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (exchangeConn?.api_key && exchangeConn.api_secret_ciphertext && exchangeConn.api_secret_nonce) {
      const apiKey = exchangeConn.api_key;
      let apiSecret: string;
      try {
        apiSecret = decryptExchangeSecret(
          exchangeConn.api_secret_ciphertext,
          exchangeConn.api_secret_nonce,
        );
      } catch (err) {
        console.error("[ExecutorFactory] decrypt exchange_connection failed:", err);
        throw new Error("Failed to decrypt API keys. Please reconnect your exchange.");
      }

      const testnet = exchangeConn.is_testnet || false;

      const proxyEnabled = process.env.BINANCE_PROXY_ENABLED !== "0";
      if (proxyEnabled) {
        return new BinanceProxyExecutor(supabase, userId, apiKey, apiSecret, testnet);
      }
      return new BinanceExecutor({ apiKey, apiSecret, testnet });
    }

    // 2) MIDLERTIDIG: user_binance_keys (api_key_id/api_secret_id → Supabase Vault)
    const { data: ubkRow } = await supabase
      .from("user_binance_keys")
      .select("api_key_id, api_secret_id, is_testnet, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (ubkRow?.api_key_id && ubkRow.api_secret_id) {
      const { data: decryptedKeys, error: vaultError } = await supabase.rpc(
        "decrypt_binance_keys",
        {
          key_id: ubkRow.api_key_id,
          secret_id: ubkRow.api_secret_id,
        },
      );

      if (!vaultError && decryptedKeys && Array.isArray(decryptedKeys) && decryptedKeys.length > 0) {
        const keys = decryptedKeys[0] as {
          api_key: string;
          api_secret: string;
          is_testnet?: boolean;
        };
        const testnet = ubkRow.is_testnet || keys.is_testnet || false;

        const proxyEnabled = process.env.BINANCE_PROXY_ENABLED !== "0";
        if (proxyEnabled) {
          return new BinanceProxyExecutor(
            supabase,
            userId,
            keys.api_key,
            keys.api_secret,
            testnet,
          );
        }
        return new BinanceExecutor({
          apiKey: keys.api_key,
          apiSecret: keys.api_secret,
          testnet,
        });
      }
      console.error("[ExecutorFactory] vault decrypt (user_binance_keys) failed:", vaultError);
    }

    // 3) LEGACY: user_profiles.binance_api_key_id + decrypt_binance_keys RPC
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
    if (!allowedTiers.includes(profile.tier as (typeof allowedTiers)[number])) {
      throw new Error("Live trading requires Bachelor tier or higher");
    }

    // Check Binance connection
    if (!profile.binance_connected) {
      throw new Error(
        "Binance API keys not configured. Please connect your exchange first.",
      );
    }

    // Decrypt API keys using RPC function
    if (!profile.binance_api_key_id || !profile.binance_api_secret_id) {
      throw new Error("Binance API key IDs are missing despite binance_connected flag");
    }
    const { data: decryptedKeys, error } = await supabase.rpc("decrypt_binance_keys", {
      key_id: profile.binance_api_key_id,
      secret_id: profile.binance_api_secret_id,
    });

    if (
      error ||
      !decryptedKeys ||
      !Array.isArray(decryptedKeys) ||
      decryptedKeys.length === 0
    ) {
      console.error("Failed to decrypt Binance keys:", error);
      throw new Error(
        "Failed to retrieve API keys. Please reconnect your exchange.",
      );
    }

    const keys = decryptedKeys[0] as {
      api_key: string;
      api_secret: string;
      is_testnet?: boolean;
    };

    const testnet = keys.is_testnet || false;

    // Route through Supabase Edge Function proxy unless explicitly disabled.
    // Proxy avoids Cloudflare Worker egress IP blocks from Binance WAF.
    const proxyEnabled = process.env.BINANCE_PROXY_ENABLED !== "0";

    if (proxyEnabled) {
      return new BinanceProxyExecutor(
        supabase,
        userId,
        keys.api_key,
        keys.api_secret,
        testnet,
      );
    }

    return new BinanceExecutor({
      apiKey: keys.api_key,
      apiSecret: keys.api_secret,
      testnet,
    });
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
      .select("tier, binance_connected")
      .eq("id", userId)
      .single();

    if (!profile) {
      return false;
    }

    const tierOk = ["bachelor", "master", "phd", "professor"].includes(profile.tier);

    // Nøkler: ny kanonisk (exchange_connections) ELLER user_binance_keys ELLER legacy
    const { data: exchangeConn } = await supabase
      .from("exchange_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    const { data: ubkRow } = await supabase
      .from("user_binance_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const hasKeys = Boolean(exchangeConn) || Boolean(ubkRow) || Boolean(profile.binance_connected);
    return tierOk && hasKeys;
  }
}
