/**
 * Unified currency formatting utilities.
 * Single source of truth for NOK formatting across the entire codebase.
 */

export type FormatNOKOptions = {
  locale?: string;
  showSign?: boolean;
  style?: "currency" | "decimal";
  fractionDigits?: number;
};

export function formatNOK(
  value: number | null | undefined,
  options?: string | FormatNOKOptions,
): string {
  if (value === null || value === undefined) return "—";

  const opts: FormatNOKOptions =
    typeof options === "string" ? { locale: options } : options ?? {};

  const {
    locale = "no-NO",
    showSign = false,
    style = "currency",
    fractionDigits = 2,
  } = opts;

  if (showSign) {
    const abs = Math.abs(value);
    const prefix = value < 0 ? "−" : "+";
    const formatted = abs.toLocaleString(locale === "no" ? "nb-NO" : "en-US", {
      maximumFractionDigits: fractionDigits,
    });
    return `${prefix}${formatted} kr`;
  }

  if (style === "decimal") {
    return new Intl.NumberFormat(locale, {
      style: "decimal",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  locale?: string,
): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString(locale ?? "no-NO", { maximumFractionDigits: 1 })}%`;
}
