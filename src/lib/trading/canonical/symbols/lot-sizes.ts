/**
 * Statisk lot-size-hjelper for backtest.
 *
 * Backtest har ikke tilgang til live exchangeInfo, så vi bruker et fast
 * oppslag for de vanligste symbolene. Ukjente symboler faller tilbake til
 * generøse verdier som tilsvarer BTCUSDT-presisjon.
 */

export interface LotSizeInfo {
  stepSize: number;
  minQty: number;
}

const STATIC_LOT_SIZES: Record<string, LotSizeInfo> = {
  // Verifisert mot Kraken-kvoter (2026-08-01).
  // FIX: kun BTC/ETH → alle Klarpakke-symboler; feil fallback (BTC-presisjon)
  // ga LOT_SIZE-reject for ADA/DOGE (prod-bevis: live-ordre 400 Filter failure).
  BTCUSDT: { stepSize: 0.00001, minQty: 0.00001 },
  ETHUSDT: { stepSize: 0.0001, minQty: 0.0001 },
  BNBUSDT: { stepSize: 0.001, minQty: 0.001 },
  SOLUSDT: { stepSize: 0.001, minQty: 0.001 },
  XRPUSDT: { stepSize: 0.1, minQty: 0.1 },
  ADAUSDT: { stepSize: 0.1, minQty: 0.1 },
  DOGEUSDT: { stepSize: 1, minQty: 1 },
  DOTUSDT: { stepSize: 0.01, minQty: 0.01 },
  LINKUSDT: { stepSize: 0.01, minQty: 0.01 },
  AVAXUSDT: { stepSize: 0.01, minQty: 0.01 },
  // MATIC ble migrert til POL (2024) — MATICUSDT finnes ikke lenger på
  // Kraken (verken mainnet eller testnet).
  POLUSDT: { stepSize: 0.1, minQty: 0.1 },
};

const DEFAULT_LOT_SIZE: LotSizeInfo = {
  stepSize: 0.00001,
  minQty: 0.00001,
};

/**
 * Returnerer statisk lot-size-info for et symbol.
 */
export function getSymbolLotInfo(symbol: string): LotSizeInfo {
  const normalized = symbol.trim().toUpperCase();
  return STATIC_LOT_SIZES[normalized] ?? DEFAULT_LOT_SIZE;
}

/**
 * Runder kvantum ned til gyldig step size.
 */
export function roundToLotSize(symbol: string, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const { stepSize } = getSymbolLotInfo(symbol);
  const precision = Math.max(0, Math.round(-Math.log10(stepSize)));
  const multiplier = Math.pow(10, precision);
  return Math.floor(quantity * multiplier) / multiplier;
}
