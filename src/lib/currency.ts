export type Currency = "NOK" | "EUR" | "USD";

const RATES_FROM_NOK: Record<Currency, number> = {
  NOK: 1,
  USD: 1 / 10.8,
  EUR: 1 / 11.5,
};

const RATES_TO_NOK: Record<Currency, number> = {
  NOK: 1,
  USD: 10.8,
  EUR: 11.5,
};

export function convertFromNOK(amountNOK: number, target: Currency): number {
  return amountNOK * RATES_FROM_NOK[target];
}

export function convertToNOK(amount: number, from: Currency): number {
  return amount * RATES_TO_NOK[from];
}

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  NOK: new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }),
  EUR: new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }),
};

export function formatCurrency(amount: number, currency: Currency): string {
  return FORMATTERS[currency].format(amount);
}

/**
 * Format an amount that is stored in NOK, converting + formatting
 * to the user's selected display currency.
 */
export function formatFromNOK(amountNOK: number, display: Currency): string {
  return formatCurrency(convertFromNOK(amountNOK, display), display);
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  NOK: "NOK",
  EUR: "EUR",
  USD: "USD",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NOK: "kr",
  EUR: "€",
  USD: "$",
};

export const CURRENCIES: Currency[] = ["NOK", "EUR", "USD"];

const STORAGE_KEY = "klarpakke-display-currency";

export function getStoredCurrency(): Currency {
  if (typeof window === "undefined") return "NOK";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "NOK" || stored === "EUR" || stored === "USD") return stored;
  return "NOK";
}

export function setStoredCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, currency);
}
