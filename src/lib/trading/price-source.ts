/**
 * Per-bruker valg av priskilde i tick-motoren (Task 2, Kraken-priser).
 *
 * EU/EØS-fakta (2026): Binance er geo-blokkert for norske brukere (MiCA).
 * Kraken er MiCA-regulert → Kraken er DEFAULTPRISKILDEN for ALLE brukere,
 * ikke bare de med tilkoblede Kraken-nøkler. fetchCandles faller automatisk
 * tilbake til Binance ved Kraken-feil/par-mangel, så tick dør aldri.
 */

export type PriceSource = "kraken" | "binance";

/**
 * Velger priskilde for én bruker.
 * - ALLE brukere → "kraken" (EU-sannhet; fallback til binance i fetchCandles)
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
 * Cache-nøkkel for candle-cache — unik per (kilde, symbol) slik at ett symbol
 * kan ha BÅDE kraken- og binance-lys i samme tick (Tom + vanlig bruker
 * handler samme symbol). Format: `${source}:${symbol}`.
 */
export function priceCacheKey(source: PriceSource, symbol: string): string {
  return `${source}:${symbol}`;
}
