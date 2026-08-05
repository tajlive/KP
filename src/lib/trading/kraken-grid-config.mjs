/**
 * Kraken Grid Config — SSoT for par-parametere (Task 4, plan 2026-08-05).
 *
 * Kilde for BÅDE scripts/kraken-grid-manager.mjs og TDD-tester.
 * .mjs fordi manageren kjøres av Hermes-cron med ren `node` (ingen tsx/loader).
 *
 * Fill-fysikk-regelen (fra backtest-pipeline-skillen, 2026-08-05):
 *   spacing >= 2 x taker-fee x 1.9   (0.26% x 2 = 0.52% round-trip)
 *   0.52% x 1.9 ≈ 1.0%  →  alle par: spacing >= 0.010
 *   BTC/XBT har lavest 24h-range (1.8%) og sto derfor på 0.008 — økt til
 *   0.010 så fee-økonomien ikke spiser fortjenesten (0.8% gir netto ~0.026
 *   USDC/syklus vs 0.044 ved 1.0% på 9.24 USDC-nivå).
 *
 * active: false = konfigurasjon verifisert men par IKKE aktivert ennå
 * (ADA/AVAX aktiveres ved equity >= 250 USDC, Task 6). Manageren opererer
 * kun på active-par; inaktive oppføringer valideres av tester og ordremin.
 */

export const PAIR_CFG = {
  // asset = Kraken-balansenøkkel (legacy-prefiks: XXBT/XETH; SOL/ADA/DOT uten)
  XBTUSDC: { dec: 1, ordremin: 0.00005, spacing: 0.010, active: true, asset: "XXBT" },
  ETHUSDC: { dec: 2, ordremin: 0.001, spacing: 0.010, active: true, asset: "XETH" },
  SOLUSDC: { dec: 2, ordremin: 0.06, spacing: 0.012, active: true, asset: "SOL" },
  // Kandidater ved 250 USDC (Task 3-filter: OOS PF ≥ 1.1, range ≥ 2.5%, ordremin ≤ 8 USDC)
  // ADA: OOS PF 4.49, range 5.2% (høyest volatilitet) — DOT: OOS PF 4.55, range 2.9%
  // AVAX (PF 3.03, range 2.5% nøyaktig på terskelen) er reserve — se par-univers-rapporten
  ADAUSDC: { dec: 4, ordremin: 20, spacing: 0.012, active: false, asset: "ADA" },
  DOTUSDC: { dec: 4, ordremin: 3.9, spacing: 0.012, active: false, asset: "DOT" },
};

/** Par manageren faktisk skal operere på (kun active). */
export const ACTIVE_PAIRS = () =>
  Object.entries(PAIR_CFG)
    .filter(([, cfg]) => cfg.active)
    .map(([pair]) => pair);

/** +2 % trailing-salg — dekker 0,52 % round-trip fee med 3,8x margin. */
export const TRAIL_SELL_PCT = 1.02;

/** Minste nye nivå i USDC. */
export const MIN_LEVEL_USDC = 8;

/** Beskyttelse mot ordre-spam (15 standard + margin). */
export const MAX_OPEN_ORDERS = 20;

/** USDC idle over dette → nytt nivå. */
export const IDLE_THRESHOLD = 25;

/**
 * Fill-fysikk-validering: spacing må gi positiv netto etter round-trip fees.
 * netto per syklus = nivå x (spacing - 2 x taker_fee). Taker-fee antas 0.26%.
 */
export const TAKER_FEE_PCT = 0.0026;

export function spacingOk(spacing = 0, fee = TAKER_FEE_PCT) {
  return spacing > 2 * fee * 1.9;
}

/** Returnerer alle par der spacing bryter fill-fysikk-regelen (for tester). */
export function invalidSpacingPairs(fee = TAKER_FEE_PCT) {
  return Object.entries(PAIR_CFG)
    .filter(([, cfg]) => !spacingOk(cfg.spacing, fee))
    .map(([pair]) => pair);
}
