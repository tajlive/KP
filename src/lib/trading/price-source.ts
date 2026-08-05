/**
 * Per-bruker valg av priskilde i tick-motoren (Task 2, Kraken-priser).
 *
 * Kraken-tilkoblede brukere (rad i user_kraken_keys med is_active=true) får
 * lekepenger-priser fra Kraken; alle andre beholder Binance. Ren og testbar —
 * ingen sideeffekter, ingen I/O.
 */

export type PriceSource = "kraken" | "binance";

/**
 * Velger priskilde for én bruker.
 * - userId ∈ krakenUserIds → "kraken"
 * - ellers (inkludert tomme/ukjente userId) → "binance"
 */
export function pickPriceSource(
  userId: string,
  krakenUserIds: Set<string>,
): PriceSource {
  return krakenUserIds.has(userId) ? "kraken" : "binance";
}

/**
 * Cache-nøkkel for candle-cache — unik per (kilde, symbol) slik at ett symbol
 * kan ha BÅDE kraken- og binance-lys i samme tick (Tom + vanlig bruker
 * handler samme symbol). Format: `${source}:${symbol}`.
 */
export function priceCacheKey(source: PriceSource, symbol: string): string {
  return `${source}:${symbol}`;
}
