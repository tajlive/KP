"use client";

import { useLocale } from "next-intl";

export type CurrencyCode = "NOK" | "EUR" | "USD" | "BTC";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  decimals: number;
}

const currencyMap: Record<string, CurrencyConfig> = {
  no: {
    code: "NOK",
    symbol: "kr",
    locale: "nb-NO",
    decimals: 0,
  },
  en: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    decimals: 2,
  },
  th: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    decimals: 2,
  },
  zh: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    decimals: 2,
  },
};

export function useCurrency() {
  const locale = useLocale();
  const config = currencyMap[locale] || currencyMap["no"];

  const format = (amount: number, options?: { compact?: boolean; crypto?: boolean }): string => {
    const { compact = false, crypto = false } = options || {};
    
    if (crypto) {
      return `${amount.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })} BTC`;
    }

    if (compact && Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M ${config.symbol}`;
    }
    
    if (compact && Math.abs(amount) >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}k ${config.symbol}`;
    }

    // NOK typically doesn't show decimals for whole numbers
    if (config.code === "NOK") {
      const rounded = Math.round(amount);
      return `${rounded.toLocaleString(config.locale)} ${config.symbol}`;
    }

    return `${config.symbol}${amount.toLocaleString(config.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    })}`;
  };

  const formatPercent = (value: number): string => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return {
    code: config.code,
    symbol: config.symbol,
    locale: config.locale,
    format,
    formatPercent,
  };
}

export function useCurrencyCode(): CurrencyCode {
  const locale = useLocale();
  return currencyMap[locale]?.code || "NOK";
}
