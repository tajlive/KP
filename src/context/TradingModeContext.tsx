"use client";

import type { TradingMode } from "@/types/trading";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TradingModeContextValue {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
  /**
   * true når brukeren aktivt har byttet modus i denne økten (klikk på toggle).
   * Brukes av DashboardContent for å vite om server-metrics skal forkastes —
   * en automatisk synk fra profilen (server) er IKKE et aktivt bytte.
   */
  userSwitched: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const TradingModeContext = createContext<TradingModeContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface TradingModeProviderProps {
  children: React.ReactNode;
  initialMode?: TradingMode;
  onChange?: (mode: TradingMode) => void;
}

export function TradingModeProvider({
  children,
  initialMode = "paper",
  onChange,
}: TradingModeProviderProps) {
  const t = useTranslations("dashboard.tradingMode");
  const [mode, setModeState] = useState<TradingMode>(initialMode);
  const [userSwitched, setUserSwitched] = useState(false);

  // Synk modus fra serveren (user_profiles.preferred_trading_mode) ved mount.
  // initialMode fra layout er bare en gjetning — profilen er SSoT.
  // Dette er IKKE et aktivt bruker-bytte → userSwitched forblir false.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/trading/mode", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const serverMode = data.mode === "live" ? "live" : "paper";
        setModeState((current) => (current === serverMode ? current : serverMode));
      })
      .catch(() => {
        // Stille fallback: behold initialMode ved nettverksfeil
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((newMode: TradingMode) => {
    setModeState(newMode);
    setUserSwitched(true);
    onChange?.(newMode);
    const message =
      newMode === "paper"
        ? t("switchedToPaper")
        : t("switchedToLive");
    toast.success(message, {
      id: "trading-mode-toast",
      duration: 2500,
    });
  }, [t, onChange]);

  return (
    <TradingModeContext.Provider value={{ mode, setMode, userSwitched }}>
      {children}
    </TradingModeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTradingMode(): TradingModeContextValue {
  const ctx = useContext(TradingModeContext);
  if (!ctx) {
    throw new Error("useTradingMode must be used inside <TradingModeProvider>");
  }
  return ctx;
}
