/**
 * Henter beste walk-forward-validerte grid-oppsett per symbol
 * fra backtest_results (fylt av scripts/backtest-sweep.mjs).
 *
 * Dette er koblingen mellom simulering og live trading:
 * tick/pilot-engine slår opp her før de oppretter/oppdaterer
 * grid-sesjoner, slik at grid_levels/range alltid er det
 * siste backtestede vinner-oppsettet — ikke gjetting.
 *
 * Fallback: hardkodede defaults hvis DB ikke svarer eller
 * symbolet aldri har blitt sweept.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface BestGridConfig {
  symbol: string;
  gridLevels: number;
  rangePct: number;
  lowerPrice: number;
  upperPrice: number;
  testSharpe: number;
  testReturnPct: number;
  testMaxDd: number;
  computedAt: string;
}

/** Minimum sharpe for at et oppsett skal brukes live. */
const MIN_SHARPE = 2.0;
/** Minimum overfit-ratio (test/train) — under dette er oppsettet overtilpasset. */
const MIN_OVERFIT_RATIO = 0.5;

/** Defaults når ingen backtest finnes (konservative, fra sweep-funn). */
const FALLBACK: Record<string, { gridLevels: number; rangePct: number }> = {
  BTCUSDT: { gridLevels: 30, rangePct: 0.10 },
  ETHUSDT: { gridLevels: 30, rangePct: 0.10 },
  SOLUSDT: { gridLevels: 50, rangePct: 0.25 },
  AVAXUSDT: { gridLevels: 50, rangePct: 0.25 },
  DOGEUSDT: { gridLevels: 50, rangePct: 0.25 },
  LINKUSDT: { gridLevels: 30, rangePct: 0.15 },
  ADAUSDT: { gridLevels: 30, rangePct: 0.10 },
  DOTUSDT: { gridLevels: 50, rangePct: 0.15 },
  UNIUSDT: { gridLevels: 20, rangePct: 0.05 },
  POLUSDT: { gridLevels: 20, rangePct: 0.10 },
};

const GENERIC_FALLBACK = { gridLevels: 20, rangePct: 0.10 };

interface BacktestRow {
  symbol: string;
  total_return_pct: number | null;
  sharpe_ratio: number | null;
  max_drawdown_pct: number | null;
  metrics: {
    grid_levels?: number;
    range_pct?: number;
    lower_price?: number;
    upper_price?: number;
    overfit_ratio?: number | null;
  } | null;
  created_at: string;
}

/**
 * Hent beste grid-config per symbol fra siste sweep.
 * Returnerer map symbol → config. Kun symboler med sharpe >= MIN_SHARPE
 * og overfit_ratio >= MIN_OVERFIT_RATIO inkluderes.
 */
export async function getBestGridConfigs(
  supabase: SupabaseClient,
): Promise<Map<string, BestGridConfig>> {
  const out = new Map<string, BestGridConfig>();
  try {
    const { data, error } = await supabase
      .from("backtest_results")
      .select("symbol, total_return_pct, sharpe_ratio, max_drawdown_pct, metrics, created_at")
      .eq("strategy", "GRID")
      .not("sharpe_ratio", "is", null)
      .order("sharpe_ratio", { ascending: false })
      .limit(200);

    if (error || !data) return out;

    for (const row of data as BacktestRow[]) {
      // Første (høyeste sharpe) per symbol vinner — list er sortert desc
      if (out.has(row.symbol)) continue;

      const sharpe = Number(row.sharpe_ratio ?? 0);
      const overfit = row.metrics?.overfit_ratio;
      if (sharpe < MIN_SHARPE) continue;
      if (overfit != null && overfit < MIN_OVERFIT_RATIO) continue;

      out.set(row.symbol, {
        symbol: row.symbol,
        gridLevels: row.metrics?.grid_levels ?? GENERIC_FALLBACK.gridLevels,
        rangePct: row.metrics?.range_pct ?? GENERIC_FALLBACK.rangePct,
        lowerPrice: row.metrics?.lower_price ?? 0,
        upperPrice: row.metrics?.upper_price ?? 0,
        testSharpe: sharpe,
        testReturnPct: Number(row.total_return_pct ?? 0),
        testMaxDd: Number(row.max_drawdown_pct ?? 0),
        computedAt: row.created_at,
      });
    }
  } catch {
    // stille fallback — grid kjører med defaults
  }
  return out;
}

/**
 * Hent config for ett symbol — DB-treff eller fallback.
 * Alltid et gyldig svar (aldri null), slik at grid alltid kan kjøre.
 */
export async function getGridConfigForSymbol(
  supabase: SupabaseClient,
  symbol: string,
  currentPrice: number,
): Promise<{ gridLevels: number; lowerPrice: number; upperPrice: number; source: "backtest" | "fallback" }> {
  const configs = await getBestGridConfigs(supabase);
  const hit = configs.get(symbol);

  if (hit) {
    // Re-senter range rundt NÅVÆRENDE pris (backtest-priser er historiske)
    const halfSpan = currentPrice * hit.rangePct;
    return {
      gridLevels: hit.gridLevels,
      lowerPrice: currentPrice - halfSpan,
      upperPrice: currentPrice + halfSpan,
      source: "backtest",
    };
  }

  const fb = FALLBACK[symbol] ?? GENERIC_FALLBACK;
  const halfSpan = currentPrice * fb.rangePct;
  return {
    gridLevels: fb.gridLevels,
    lowerPrice: currentPrice - halfSpan,
    upperPrice: currentPrice + halfSpan,
    source: "fallback",
  };
}
