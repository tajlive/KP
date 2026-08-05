/**
 * Ren drawdown-beregning for Kraken grid-manager kill-switch.
 * Trukket ut av scripts/kraken-grid-manager.mjs for testbarhet (Task 7, TDD).
 *
 * Kill-regelen (bruker-beskyttelse): hvis equity (USDC-kontant + markedsverdi
 * av krypto-beholdning) faller mer enn DRAWDOWN_KILL_PCT fra startkapitalen,
 * skal ALLE ordre kanselleres og trading stoppes.
 *
 * Progressiv drawdown (Task 4b, plan 2026-08-05 — fra Basso/Market Wizards-
 * forskningen «reduser posisjoner dobbelt så raskt som drawdown»):
 *   drawdown <= 7%            → normal (levelSizeMultiplier 1.0)
 *   7% < drawdown <= 15%      → halverte nivåstørrelser (0.5) — grid fortsetter
 *                               men med halv eksponering på nye nivåer
 *   drawdown > 15%            → full kill (skalKill=true, alle ordre kansellert)
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

export type DrawdownLevel = "normal" | "reduced" | "kill";

export interface ProgressiveDrawdownResult {
  /** Nåværende beskyttelsesnivå */
  level: DrawdownLevel;
  /** Multiplikator for nye nivåstørrelser (1.0 normal, 0.5 halvert, 0 ved kill) */
  levelSizeMultiplier: number;
  /** Samme drawdown-info som evaluateDrawdownKill */
  drawdown: number;
  drawdownPct: number;
  remainingPct: number;
  shouldKill: boolean;
}

const DEFAULT_KILL_THRESHOLD = 0.15;
/** Første trinn: halver nye nivåer ved 7 % drawdown (Basso: reduser 2x drawdown) */
export const REDUCE_THRESHOLD_PCT = 0.07;
export const REDUCED_SIZE_MULTIPLIER = 0.5;

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

/**
 * Progressiv drawdown-beskyttelse: halverte nivåstørrelser før full kill.
 * killThresholdPct er den EKTE kill-terskelen (15 %); REDUCE_THRESHOLD_PCT
 * (7 %) er trinnet der nye nivåer halveres.
 */
export function evaluateProgressiveDrawdown({
  equityUsdc,
  initialEquityUsdc,
  killThresholdPct = DEFAULT_KILL_THRESHOLD,
}: KillCheckInput): ProgressiveDrawdownResult {
  const base = evaluateDrawdownKill({ equityUsdc, initialEquityUsdc, killThresholdPct });

  let level: DrawdownLevel = "normal";
  let levelSizeMultiplier = 1;

  if (base.shouldKill) {
    level = "kill";
    levelSizeMultiplier = 0;
  } else if (base.drawdown > REDUCE_THRESHOLD_PCT) {
    level = "reduced";
    levelSizeMultiplier = REDUCED_SIZE_MULTIPLIER;
  }

  return {
    level,
    levelSizeMultiplier,
    drawdown: base.drawdown,
    drawdownPct: base.drawdownPct,
    remainingPct: base.remainingPct,
    shouldKill: base.shouldKill,
  };
}

/** Equity-mål der grid utvides fra 3 til 5 par (Task 6, plan 2026-08-05). */
export const FIVE_PAIR_EQUITY_TARGET = 250;

/**
 * Skal 5-par-modus aktiveres? (idempotent — kun én gang)
 * Aktiveres når equity >= FIVE_PAIR_EQUITY_TARGET og ikke allerede aktivert.
 */
export function shouldActivateFivePair(
  equityUsdc: number,
  alreadyActivated: boolean,
  target: number = FIVE_PAIR_EQUITY_TARGET,
): boolean {
  return !alreadyActivated && equityUsdc >= target;
}
