"use client";

import { createClient } from "@/lib/utils";
import {
  BinanceConnection,
  TradingMode,
  TradingModeState,
} from "@/types/trading";
import { useCallback, useEffect, useState } from "react";

export function useTradingMode() {
  const [state, setState] = useState<TradingModeState>({
    mode: "paper",
    canSwitchToLive: false,
    paperBalance: 1000000,
    liveBalance: null,
    isLoading: true,
    error: null,
  });

  const [binanceConnection, setBinanceConnection] = useState<BinanceConnection>(
    {
      isConnected: false,
      apiKeyLast4: null,
      connectedAt: null,
      balance: null,
    },
  );

  const supabase = createClient();

  // Fetch initial trading mode and Binance connection status
  useEffect(() => {
    const fetchTradingMode = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("tier")
          .eq("id", user.id)
          .maybeSingle();

        const liveTiers = ["master", "phd", "professor"];
        const canSwitchToLive = liveTiers.includes(profile?.tier || "");

        setState((prev) => ({
          ...prev,
          mode: "paper",
          canSwitchToLive,
          isLoading: false,
        }));

        setBinanceConnection({
          isConnected: canSwitchToLive,
          apiKeyLast4: canSwitchToLive ? "****" : null,
          connectedAt: null,
          balance: null, // Would fetch from Binance API
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to load trading mode",
          isLoading: false,
        }));
      }
    };

    fetchTradingMode();
  }, [supabase]);

  // Switch trading mode
  const switchMode = useCallback(
    async (newMode: TradingMode): Promise<boolean> => {
      try {
        if (newMode === "live" && !state.canSwitchToLive) {
          setState((prev) => ({
            ...prev,
            error: "Binance API not connected. Please connect your Binance account first.",
          }));
          return false;
        }

        // Optimistic update: switch mode in UI immediately
        const previousMode = state.mode;
        setState((prev) => ({ ...prev, mode: newMode, isLoading: false, error: null }));

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Persist to database
        const { error } = await supabase.rpc("set_trading_mode", {
          user_uuid: user.id,
          new_mode: newMode,
        });

        if (error) throw error;

        return true;
      } catch (err) {
        // Rollback to previous mode
        setState((prev) => ({
          ...prev,
          mode: state.mode,
          error:
            err instanceof Error
              ? err.message
              : "Failed to switch trading mode",
          isLoading: false,
        }));
        return false;
      }
    },
    [supabase, state.canSwitchToLive],
  );

  // Connect Binance API
  const connectBinance = useCallback(
    async (apiKey: string, apiSecret: string): Promise<boolean> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Verify API key against Binance
        const isValid = await verifyBinanceApiKey(apiKey, apiSecret);
        if (!isValid) {
          throw new Error("Invalid Binance API key or secret");
        }

        // Encrypt and store API credentials via secure API route
        const encryptResponse = await fetch("/api/binance/encrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, apiSecret }),
        });

        if (!encryptResponse.ok) {
          throw new Error("Failed to encrypt API credentials");
        }

        const { encryptedKey, encryptedSecret } = await encryptResponse.json();

        const { error } = await supabase
          .from("user_profiles")
          .update({
            binance_connected: true,
            binance_api_key_id: encryptedKey,
            binance_api_secret_id: encryptedSecret,
          })
          .eq("id", user.id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          canSwitchToLive: true,
          isLoading: false,
        }));

        setBinanceConnection({
          isConnected: true,
          apiKeyLast4: "****" + apiKey.slice(-4),
          connectedAt: new Date().toISOString(),
          balance: null,
        });

        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to connect Binance",
          isLoading: false,
        }));
        return false;
      }
    },
    [supabase],
  );

  // Disconnect Binance
  const disconnectBinance = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_profiles")
        .update({
          binance_connected: false,
          binance_api_key_id: null,
          binance_api_secret_id: null,
          trading_mode: "paper",
        })
        .eq("id", user.id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        mode: "paper",
        canSwitchToLive: false,
        isLoading: false,
      }));

      setBinanceConnection({
        isConnected: false,
        apiKeyLast4: null,
        connectedAt: null,
        balance: null,
      });

      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "Failed to disconnect Binance",
        isLoading: false,
      }));
      return false;
    }
  }, [supabase]);

  return {
    ...state,
    binanceConnection,
    switchMode,
    connectBinance,
    disconnectBinance,
  };
}

// Verify Binance API key
async function verifyBinanceApiKey(
  apiKey: string,
  apiSecret: string,
): Promise<boolean> {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;

    // Create signature (would use crypto library in production)
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(queryString),
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`,
      {
        headers: { "X-MBX-APIKEY": apiKey },
      },
    );

    if (!response.ok) return false;

    const data = await response.json();

    // Check that API key does NOT have withdraw permissions
    if (data.permissions?.includes("WITHDRAW")) {
      throw new Error(
        "API key must NOT have withdraw permission for security reasons",
      );
    }

    return true;
  } catch (error) {
    console.error("Binance API verification failed:", error);
    return false;
  }
}
