/**
 * Default-ruting av strategi for nye auto/pilot-sesjoner (POST /api/pilot).
 *
 * Bakgrunn (2026-08-05, trading-agent-forslag): grid er eneste strategi med
 * positiv backtest (PF 7.42 OOS), multi_signal er negativ på 9/10 par (PF 0.60).
 * Grid blir derfor default for nye sesjoner — bak feature-flagget
 * `GRID_DEFAULT_ROUTING` (verdi "off" = gammel oppførsel, alt annet/udefinert
 * = grid) for A/B-testing.
 */

export type PilotSessionMode = "auto" | "pilot";

/**
 * Leser feature-flagget GRID_DEFAULT_ROUTING.
 * Default (udefinert) og alle andre verdier enn "off" → true (grid default).
 * Eksplisitt "off" → false (gammel oppførsel).
 */
export function isGridDefaultRouting(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.GRID_DEFAULT_ROUTING !== "off";
}

/**
 * strategy_id for trading_sessions-insertet.
 * gridDefault=true → pilot → "simple_grid" (COMBO E3, backtest-bevis 2026-08-10),
 *                     auto  → "grid" (uendret for eksisterende auto-brukere).
 * gridDefault=false → gammel oppførsel: auto → multi_signal, pilot → cryptopilot.
 */
export function resolveDefaultStrategyId(
  mode: PilotSessionMode,
  gridDefault: boolean,
): string {
  if (gridDefault) return mode === "pilot" ? "simple_grid" : "grid";
  return mode === "auto" ? "multi_signal" : "cryptopilot";
}

/**
 * strategy i auto_trading_configs-upserten.
 * gridDefault=true → pilot → "simple_grid", auto → "grid".
 * gridDefault=false → gammel oppførsel: auto → multi_signal, pilot → grid.
 */
export function resolveAutoConfigStrategy(
  mode: PilotSessionMode,
  gridDefault: boolean,
): string {
  if (gridDefault) return mode === "pilot" ? "simple_grid" : "grid";
  return mode === "pilot" ? "grid" : "multi_signal";
}
