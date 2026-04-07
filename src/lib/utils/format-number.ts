/**
 * Number formatting utilities
 */

export interface FormatNumberOptions {
  /** Number of decimal places for compact notation (default: 1) */
  decimals?: number;
  /** Locale for formatting (default: 'no-NO') */
  locale?: string;
  /** Force compact notation even for small numbers */
  compact?: boolean;
}

/**
 * Format a number to compact notation (e.g., 100000 -> "100k", 1500000 -> "1.5M")
 * Uses Norwegian locale by default for proper decimal separator
 *
 * @example
 * formatNumber(100000)     // "100k"
 * formatNumber(10200)      // "10,2k"
 * formatNumber(1500000)    // "1,5M"
 * formatNumber(999)        // "999"
 * formatNumber(1500, { decimals: 0 })  // "2k"
 */
export function formatNumber(
  value: number,
  options: FormatNumberOptions = {}
): string {
  const { decimals = 1, locale = 'no-NO', compact = false } = options;

  // For numbers less than 1000, return as-is unless compact is forced
  if (!compact && Math.abs(value) < 1000) {
    return value.toLocaleString(locale);
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Define suffixes and thresholds
  const tiers = [
    { suffix: 'M', threshold: 1_000_000 },
    { suffix: 'k', threshold: 1_000 },
  ];

  for (const tier of tiers) {
    if (absValue >= tier.threshold) {
      const scaled = absValue / tier.threshold;
      // Format with specified decimals, removing trailing zeros
      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
      return `${sign}${formatter.format(scaled)}${tier.suffix}`;
    }
  }

  // Fallback for numbers >= 1000 but < 1M when compact is forced
  return value.toLocaleString(locale);
}

/**
 * Format a number with full notation (e.g., 100000 -> "100 000")
 * Uses Norwegian locale with space as thousands separator
 *
 * @example
 * formatNumberFull(100000)   // "100 000"
 * formatNumberFull(1500000)  // "1 500 000"
 */
export function formatNumberFull(
  value: number,
  locale: string = 'no-NO'
): string {
  return value.toLocaleString(locale);
}

/**
 * Parse a compact formatted number back to number
 * Handles both Norwegian (10,2k) and English (10.2k) formats
 *
 * @example
 * parseCompactNumber("10,2k")   // 10200
 * parseCompactNumber("1.5M")    // 1500000
 * parseCompactNumber("100k")    // 100000
 */
export function parseCompactNumber(value: string): number | null {
  const trimmed = value.trim().toLowerCase();

  // Match pattern like "10,2k" or "1.5M"
  const match = trimmed.match(/^([\d.,]+)([km]?)$/i);
  if (!match) return null;

  const [, numStr, suffix] = match;

  // Normalize number string (replace comma with dot for parsing)
  const normalizedNum = numStr.replace(',', '.');
  const num = parseFloat(normalizedNum);

  if (isNaN(num)) return null;

  switch (suffix.toLowerCase()) {
    case 'k':
      return num * 1000;
    case 'm':
      return num * 1_000_000;
    default:
      return num;
  }
}
