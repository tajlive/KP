/**
 * Normaliser winRate til 0-1 format.
 * API-er returnerer i ulike formater (0-1 eller 0-100).
 * ALLE komponenter skal bruke denne før * 100 for display.
 */
export function normalizeWinRate(value: number | null | undefined): number {
  if (value == null) return 0;
  // Hvis > 1, er det sannsynligvis 0-100 format
  if (value > 1) return value / 100;
  return value;
}

/**
 * Formater winRate for display (% suffix).
 * Input: 0-1 eller 0-100 format — output: "38%"
 */
export function formatWinRate(value: number | null | undefined): string {
  const normalized = normalizeWinRate(value);
  return `${Math.round(normalized * 100)}%`;
}
