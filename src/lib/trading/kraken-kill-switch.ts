/**
 * Ren drawdown-beregning for Kraken grid-manager kill-switch.
 * Trukket ut av scripts/kraken-grid-manager.mjs for testbarhet (Task 7, TDD).
 *
 * Kill-regelen (bruker-beskyttelse): hvis equity (USDC-kontant + markedsverdi
 * av krypto-beholdning) faller mer enn DRAWDOWN_KILL_PCT fra startkapitalen,
 * skal ALLE ordre kanselleres og trading stoppes.
 */

export interface KillCheckInput {
  /** Nåværende equity i USDC (kontant + markedsverdi av posisjoner) */
  equityUsdc: number;
  /** Startkapital ved grid-oppsett, i USDC */
  initialEquityUsdc: number;
  /** Terskel: drawdown-prosent som utløser kill (0.15 = 15%) */
  killThresholdPct?: number;
}

export interface KillCheckResult {
  /** Sann hvis drawdown overstiger terskelen → kill skal utløses */
  shouldKill: boolean;
  /** Drawdown som desimal (0.05 = 5%) */
  drawdown: number;
  /** Drawdown i prosent for logging */
  drawdownPct: number;
  /** Gjenstående equity i % av start */
  remainingPct: number;
}

const DEFAULT_KILL_THRESHOLD = 0.15;

export function evaluateDrawdownKill({
  equityUsdc,
  initialEquityUsdc,
  killThresholdPct = DEFAULT_KILL_THRESHOLD,
}: KillCheckInput): KillCheckResult {
  if (initialEquityUsdc <= 0) {
    // Ugyldig startkapital — aldri kill (unngår falsk utløsning ved 0)
    return {
      shouldKill: false,
      drawdown: 0,
      drawdownPct: 0,
      remainingPct: 100,
    };
  }

  const remainingPct = (equityUsdc / initialEquityUsdc) * 100;
  const drawdown = Math.max(0, 1 - equityUsdc / initialEquityUsdc);
  const drawdownPct = drawdown * 100;

  return {
    shouldKill: drawdown > killThresholdPct,
    drawdown,
    drawdownPct,
    remainingPct,
  };
}
