/**
 * Priskilde-valg i tick-motoren (Task 2, Kraken-priser).
 *
 * EU/EØS-fakta (2026): Kraken er eneste børs (MiCA).
 * Kraken er MiCA-regulert → Kraken er DEFAULTPRISKILDEN for ALLE brukere.
 * fetchCandles henter alltid fra Kraken-provideren.
 */

export type PriceSource = "kraken";

/**
 * Velger priskilde for én bruker.
 * - ALLE brukere → "kraken" (EU-sannhet).
 * - Parameteren `krakenUserIds` beholdes for API-kompatibilitet (callers
 *   sender fortsatt settet), men styrer ikke lenger valget.
 */
export function pickPriceSource(
  _userId: string,
  _krakenUserIds: Set<string>,
): PriceSource {
  return "kraken";
}

/**
 * Cache-nøkkel for candle-cache — unik per (kilde, symbol).
 * Format: `${source}:${symbol}`.
 */
export function priceCacheKey(source: PriceSource, symbol: string): string {
  return `${source}:${symbol}`;
}
