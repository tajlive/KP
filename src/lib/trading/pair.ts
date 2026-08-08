/**
 * Kanonisk par-normalisering.
 *
 * ÉN sannhet: "BTCUSDT" (uten slash, uppercase) — internt format
 * bruker. Tidligere sameksisterte "BTCUSDT" og "BTC/USDT" i
 * trading_sessions, som brøt den unike delindeksen
 * idx_unique_active_session og all gruppering per par.
 */
export function normalizePair(pair: string): string {
  return pair.replace(/[\s/]+/g, "").toUpperCase();
}
