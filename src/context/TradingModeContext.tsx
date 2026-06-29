"use client";

import type { TradingMode } from "@/types/trading";
import { createContext, useCallback, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TradingModeContextValue {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const TradingModeContext = createContext<TradingModeContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function TradingModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard.tradingMode");
  const [mode, setModeState] = useState<TradingMode>("paper");

  const setMode = useCallback((newMode: TradingMode) => {
    setModeState(newMode);
    const message =
      newMode === "paper"
        ? t("switchedToPaper")
        : t("switchedToLive");
    toast.success(message, {
      id: "trading-mode-toast",
      duration: 2500,
    });
  }, [t]);

  return (
    <TradingModeContext.Provider value={{ mode, setMode }}>
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
