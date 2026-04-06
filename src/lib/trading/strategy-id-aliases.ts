/**
 * Kobler produktets strategi-ID-er (UI / trading_sessions)
 * til motor-nøkler i `/api/cron/tick` (DCAStrategy, TrendFollowStrategy, …).
 *
 * Uten dette får økter opprettet fra UnifiedTradingDashboard `Unknown strategy`
 * fordi `startStrategy` lagrer f.eks. `dca_trygg` mens tick forventet `dca`.
 *
 * (Egen fil uten import fra `trading-api.ts` — den er `use client`.)
 */

/** Motor-nøkler som finnes i cron/tick `strategies`-record */
export type TickStrategyEngineKey =
  | "dca"
  | "trend_follow"
  | "multi_signal"
  | "grid";

/** UI/produkt-ID → tick-motor (samme sett som `StrategyType` i trading-api) */
export const STRATEGY_ID_TO_TICK_ENGINE = {
  dca_trygg: "dca",
  trend_balansert: "trend_follow",
  multisignal_aktiv: "multi_signal",
  grid_bot: "grid",
  // Ingen dedikert copy-motor i tick ennå — bruker multi_signal som teknisk fallback
  // (hypotese-/signal-logikk likner; copy-filtrering er P1).
  ai_copy: "multi_signal",
} as const satisfies Record<string, TickStrategyEngineKey>;

export type ProductStrategyId = keyof typeof STRATEGY_ID_TO_TICK_ENGINE;

/** Legacy / API default fra trading-sessions/create */
const LEGACY_ALIASES: Record<string, TickStrategyEngineKey> = {
  dca: "dca",
  trend_follow: "trend_follow",
  multi_signal: "multi_signal",
  grid: "grid",
  // Korte aliases fra auto-trading/paper
  multi: "multi_signal",
  trend: "trend_follow",
};

export function resolveTickStrategyEngineKey(
  strategyId: string | null | undefined,
): TickStrategyEngineKey | null {
  if (!strategyId) return null;
  if (strategyId in STRATEGY_ID_TO_TICK_ENGINE) {
    return STRATEGY_ID_TO_TICK_ENGINE[strategyId as ProductStrategyId];
  }
  if (strategyId in LEGACY_ALIASES) {
    return LEGACY_ALIASES[strategyId];
  }
  return null;
}
