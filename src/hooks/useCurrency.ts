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
import { useCallback, useSyncExternalStore } from "react";

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

  return {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    symbol: CURRENCY_SYMBOLS[currency],
    format,
    formatRaw,
    toDisplay,
    toNOK,
    formatPercent,
  };
}

export function useCurrencyCode(): Currency {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
