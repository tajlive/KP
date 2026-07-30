/**
 * Papir-handel uten aktiv `risk_profiles`-rad: demo/lekepenger skal ikke blokkere
 * beløp og par som UI tilbyr (still streng kontroll på live via eksplisitt profil).
 *
 * Inneholder også per-symbol TP/SL-konfigurasjon optimalisert fra historisk
 * trade-analyse (2026-07-28).
 *
 * Optimaliseringsmål: RR > 1.5 for alle symbols.
 * Bakgrunn: ETHUSDT hadde RR=0.54, SOLUSDT RR=0.49 i produksjon.
 */
export const PAPER_DEMO_DEFAULT_MAX_POSITION_PCT = 100;
export const PAPER_DEMO_DEFAULT_MAX_EXPOSURE_PCT = 100;
export const PAPER_DEMO_DEFAULT_MAX_DAILY_LOSS_PCT = 100;

/**
 * Per-symbol risikoparametere.
 * Optimalisert basert på Supabase trade-analyse 2026-07-28.
 *
 * Felter:
 * - maxPositionPct: Maks posisjonsstørrelse i % av kapital
 * - takeProfitPct: Take-profit i % over entry
 * - stopLossPct: Stop-loss i % under entry
 * - targetRR: Mål risk/reward ratio
 * - minSellIntervalMs: Minimum tid mellom auto-sells
 */

export interface SymbolRiskParams {
  maxPositionPct: number;
  takeProfitPct: number;
  stopLossPct: number;
  targetRR: number;
  minSellIntervalMs: number;
}

export type SymbolRiskMap = Record<string, SymbolRiskParams>;

/**
 * Anbefalt posisjonsstørrelse og TP/SL per symbol.
 *
 * Utledet fra historisk RR og win rate:
 * - BTCUSDT: 64.7% WR, RR=0.89 → trenger større TP eller strammere SL
 * - ETHUSDT: 40.9% WR, RR=0.54 → stram SL, halvert posisjon
 * - SOLUSDT: 51.5% WR, RR=0.49 → stram SL, liten posisjon
 * - Andre: konservativ 1% posisjon
 */
export const SYMBOL_RISK_PARAMS: SymbolRiskMap = {
  BTCUSDT: {
    maxPositionPct: 10,
    takeProfitPct: 10,
    stopLossPct: 5,
    targetRR: 2.0,
    minSellIntervalMs: 15 * 60 * 1000, // 15 min
  },
  ETHUSDT: {
    maxPositionPct: 3,
    takeProfitPct: 6,
    stopLossPct: 3,
    targetRR: 2.0,
    minSellIntervalMs: 30 * 60 * 1000, // 30 min (strenge)
  },
  SOLUSDT: {
    maxPositionPct: 2,
    takeProfitPct: 5,
    stopLossPct: 2,
    targetRR: 2.5,
    minSellIntervalMs: 30 * 60 * 1000, // 30 min (strenge)
  },
  DOTUSDT: {
    maxPositionPct: 1,
    takeProfitPct: 5,
    stopLossPct: 2,
    targetRR: 2.5,
    minSellIntervalMs: 30 * 60 * 1000,
  },
  BNBUSDT: {
    maxPositionPct: 1,
    takeProfitPct: 4,
    stopLossPct: 2,
    targetRR: 2.0,
    minSellIntervalMs: 30 * 60 * 1000,
  },
  ADAUSDT: {
    maxPositionPct: 2,
    takeProfitPct: 6,
    stopLossPct: 3,
    targetRR: 2.0,
    minSellIntervalMs: 15 * 60 * 1000,
  },
};

/** Hent risikoparametre for et symbol. Returnerer default hvis symbol ikke er konfigurert. */
export function getSymbolRiskParams(symbol: string): SymbolRiskParams {
  return SYMBOL_RISK_PARAMS[symbol.toUpperCase()] ?? {
    maxPositionPct: 5,
    takeProfitPct: 5,
    stopLossPct: 3,
    targetRR: 1.67,
    minSellIntervalMs: 15 * 60 * 1000,
  };
}
