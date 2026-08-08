"use client";

import {
  type Currency,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  convertFromNOK,
  convertToNOK,
  formatCurrency,
  formatFromNOK,
  getStoredCurrency,
  setStoredCurrency,
} from "@/lib/currency";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import type { TradingMode } from "@/lib/trading-api";

export type CurrencyCode = Currency | "BTC";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Currency {
  return getStoredCurrency();
}

function getServerSnapshot(): Currency {
  return "NOK";
}

/**
 * Hook that provides the user-selected display currency with
 * localStorage persistence. All values are assumed to be stored
 * in NOK and converted on the fly.
 */
export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = useCallback((c: Currency) => {
    setStoredCurrency(c);
    emitChange();
  }, []);

  const isNorwegian = useLocale() === "no";

  const format = useCallback(
    (amountNOK: number) => formatFromNOK(amountNOK, currency),
    [currency],
  );

  const formatRaw = useCallback(
    (amount: number) => formatCurrency(amount, currency),
    [currency],
  );

  const toDisplay = useCallback(
    (amountNOK: number) => convertFromNOK(amountNOK, currency),
    [currency],
  );

  const toNOK = useCallback(
    (amount: number) => convertToNOK(amount, currency),
    [currency],
  );

  const formatPercent = useCallback((value: number): string => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }, []);

  const formatByMode = useCallback(
    (amount: number, mode: TradingMode | "paper" | "live") => {
      if (mode === "paper") {
        return formatFromNOK(amount, currency);
      }
      // VALUTA-KONTRAKT (§45): alle saldo/posisjons-tall lagres i NOK — også
      // for live. USDT er kun et internt normaliseringsformat per tick og skal
      // ALDRI vises i UI. Før denne fiksen viste live-balanse «9 492,46 USDT»
      // for et tall som var NOK (current_capital_nok) — feil valuta + feil
      // enhet.
      return new Intl.NumberFormat(isNorwegian ? "nb-NO" : "en-US", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [currency, isNorwegian],
  );

  return {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    symbol: CURRENCY_SYMBOLS[currency],
    format,
    formatRaw,
    formatByMode,
    toDisplay,
    toNOK,
    formatPercent,
  };
}

export function useCurrencyCode(): Currency {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
