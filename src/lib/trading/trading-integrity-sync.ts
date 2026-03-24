/**
 * Enterprise synkronisering: handler (poll) + RSC-refresh (saldo/sesjon) når Realtime/CSP feiler.
 * Brukes av dashboard og unified trading-hub.
 */
export const TRADING_INTEGRITY_SYNC = {
  /** Poll `trades` mot Supabase (RLS) — align med handelshistorikk (~28s) */
  tradesPollIntervalMs: 28_000,
  /** Etter gjentatte feil: min(base × 2^n, cap) */
  tradesPollBackoffMaxMs: 120_000,
  /** Maks eksponent i 2^n (28→56→112→120) */
  tradesPollBackoffMaxExponent: 4,
  /** Re-fetch Server Components (user_profiles.paper_balance, trading_sessions, …) */
  rscRefreshIntervalMs: 76_000,
  /** Unngå storm ved alt-tab */
  focusDebounceMs: 1_600,
  /** Siste N handler i dashboard-widget */
  defaultTradeLimit: 50,
} as const;

/** Felles backoff for dashboard-poll og handelshistorikk-poll */
export function tradesPollIntervalAfterFailures(failures: number): number {
  const n = Math.min(
    Math.max(0, failures),
    TRADING_INTEGRITY_SYNC.tradesPollBackoffMaxExponent,
  );
  return Math.min(
    TRADING_INTEGRITY_SYNC.tradesPollIntervalMs * 2 ** n,
    TRADING_INTEGRITY_SYNC.tradesPollBackoffMaxMs,
  );
}
