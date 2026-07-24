"use client";

import {
  BinanceConnection,
  TradingMode,
  TradingModeState,
} from "@/types/trading";
import { useCallback, useEffect, useState } from "react";

/**
 * useTradingMode — leser trading-modus og Binance-tilkobling.
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie).
 * Tidligere versjon leste/skrev user_profiles direkte fra browseren —
 * det gjorde Binance-tilkobling STILLE ØDELAGT (skrivingen persiserte
 * aldri). Alt går nå via server-autentiserte API-ruter:
 * - GET/POST /api/trading/mode   (modus + entitlement-sjekk)
 * - GET/POST/DELETE /api/binance/keys (nøkkel-lagring via Edge Function)
 * - GET /api/user/profile        (paper_balance)
 */
export function useTradingMode() {
  const [state, setState] = useState<TradingModeState>({
    mode: "paper",
    canSwitchToLive: false,
    paperBalance: 100000,
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

  // Fetch initial trading mode and Binance connection status
  useEffect(() => {
    const fetchTradingMode = async () => {
      try {
        const res = await fetch("/api/trading/mode", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        const json = await res.json();

        // Paper-saldo hentes fra profilen (source of truth: paper_accounts,
        // eksponert via /api/user/profile)
        let paperBalance = 100000;
        try {
          const profileRes = await fetch("/api/user/profile", {
            credentials: "same-origin",
          });
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            const balance = profileJson?.profile?.paper_balance;
            if (typeof balance === "number") paperBalance = balance;
          }
        } catch {
          // Behold default
        }

        setState((prev) => ({
          ...prev,
          mode: json.mode === "live" ? "live" : "paper",
          canSwitchToLive: Boolean(json.canSwitchToLive),
          paperBalance,
          isLoading: false,
        }));

        setBinanceConnection({
          isConnected: Boolean(json.binanceConnected),
          apiKeyLast4: json.binanceConnected ? "****" : null,
          connectedAt: null,
          balance: null,
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
  }, []);

  // Switch trading mode
  const switchMode = useCallback(
    async (newMode: TradingMode): Promise<boolean> => {
      try {
        if (newMode === "live" && !state.canSwitchToLive) {
          setState((prev) => ({
            ...prev,
            error:
              "Binance API not connected. Please connect your Binance account first.",
          }));
          return false;
        }

        // Optimistic update: switch mode in UI immediately
        const previousMode = state.mode;
        setState((prev) => ({
          ...prev,
          mode: newMode,
          isLoading: false,
          error: null,
        }));

        const res = await fetch("/api/trading/mode", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: newMode }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to switch trading mode");
        }

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
    [state.canSwitchToLive, state.mode],
  );

  // Connect Binance API — server verifiserer nøkler, tier og krypterer
  const connectBinance = useCallback(
    async (apiKey: string, apiSecret: string): Promise<boolean> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const res = await fetch("/api/binance/keys", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, apiSecret, isTestnet: false }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to connect Binance");
        }

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
    [],
  );

  // Disconnect Binance
  const disconnectBinance = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const res = await fetch("/api/binance/keys", {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to disconnect Binance");
      }

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
  }, []);

  return {
    ...state,
    binanceConnection,
    switchMode,
    connectBinance,
    disconnectBinance,
  };
}
