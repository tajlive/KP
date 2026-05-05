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
  | "grid"
  | "ensemble_ai";

/** UI/produkt-ID → tick-motor (samme sett som `StrategyType` i trading-api) */
export const STRATEGY_ID_TO_TICK_ENGINE = {
  dca_trygg: "dca",
  trend_balansert: "trend_follow",
  multisignal_aktiv: "multi_signal",
  grid_bot: "grid",
  ensemble_ai: "ensemble_ai",
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
  ensemble_ai: "ensemble_ai",
  // Korte aliases fra auto-trading/paper
  multi: "multi_signal",
  trend: "trend_follow",
  "ai-copy": "multi_signal",
  // UUID aliases fra strategies-tabellen
  "9fab4471-a0d4-4870-9611-44bd69403775": "dca",           // DCA Trygg Alpha
  "9febe734-d40e-4a78-b65d-2b346899ca17": "trend_follow",  // Trend Balansert Beta
  "a21f535d-e0f0-4ad5-a1b9-c08a49be12f0": "multi_signal",  // MultiSignal Aktiv Gamma
  "3caad63a-a043-48fa-82f8-c54b3065130a": "grid",          // Grid Bot Delta
  "071a6106-ae28-49f2-93e5-cec281e33fc5": "multi_signal",  // AI Copy Epsilon
  "39cae21a-7449-43aa-b202-727227d30168": "multi_signal",  // Dark Fleet Champion
  "c49a9302-65bd-48ec-b5d6-51dff32e4b0e": "multi_signal",  // Dark Fleet Challenger
  "55903760-304a-4824-920b-f5bfc5530c45": "multi_signal",  // Hybrid Arbitrage Eta
  "d238229f-b837-4816-a846-9655b3f77e28": "multi_signal",  // Beta Guardrail Test
  // Copy-trading mirror sessions
  mirror_binance: "multi_signal",
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
