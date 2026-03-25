/**
 * Fast anker for `created_at` i fallback-rader før data er hentet.
 * Unngår hydration mismatch (server vs klient `Date.now()` etter millisekunder).
 */
export const LANDING_SIGNAL_FALLBACK_ANCHOR_MS = 1_735_689_600_000;

/**
 * Demo / marketing fallback when `trading_signals` is empty or unavailable.
 * Keep in sync with landing `LiveSignalFeed` expectations (symbol format, actions).
 */
const SPECS = [
  {
    id: "fallback-1",
    symbol: "BTC/USDT",
    action: "BUY",
    confidence: 87,
    entry_price: 42450,
    offsetMs: 2 * 3600_000,
  },
  {
    id: "fallback-2",
    symbol: "ETH/USDT",
    action: "SELL",
    confidence: 74,
    entry_price: 2280,
    offsetMs: 5 * 3600_000,
  },
  {
    id: "fallback-3",
    symbol: "SOL/USDT",
    action: "BUY",
    confidence: 91,
    entry_price: 98.2,
    offsetMs: 12 * 3600_000,
  },
  {
    id: "fallback-4",
    symbol: "BNB/USDT",
    action: "BUY",
    confidence: 68,
    entry_price: 312,
    offsetMs: 18 * 3600_000,
  },
] as const;

export type FallbackTradingSignal = {
  id: string;
  symbol: string;
  action: string;
  confidence: number;
  entry_price: number;
  created_at: string;
};

/**
 * @param limit — max rows (dashboard uses 3, landing uses 4)
 * @param nowMs — optional clock for stable tests
 */
export function getFallbackTradingSignals(
  limit: number,
  nowMs: number = Date.now(),
): FallbackTradingSignal[] {
  return SPECS.slice(0, Math.max(0, limit)).map((s) => ({
    id: s.id,
    symbol: s.symbol,
    action: s.action,
    confidence: s.confidence,
    entry_price: s.entry_price,
    created_at: new Date(nowMs - s.offsetMs).toISOString(),
  }));
}
