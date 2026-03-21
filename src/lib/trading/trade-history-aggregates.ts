/**
 * Aggregering for handelshistorikk (tap/vinn basert på realisert P&L).
 */

export type TradeRowWithPnl = {
  realized_pnl: number | null;
};

export type TradeHistoryAggregates = {
  /** Alle rader i listen */
  rowCount: number;
  /** realisert_pnl > 0 */
  winCount: number;
  /** realisert_pnl < 0 */
  lossCount: number;
  /** realisert_pnl === 0 (lukket breakeven) */
  breakevenCount: number;
  /** realisert_pnl er null (f.eks. enkelt kjøp/salg uten lukket posisjon i DB) */
  noRealizedPnlCount: number;
  /** Sum av realisert P&L (kun der feltet er satt) */
  totalRealizedPnl: number;
  /** Vinnrate 0–100 blant handler med kjent realisert P&L; null hvis ingen */
  winRateRealizedPct: number | null;
};

function hasNumericPnl(p: number | null | undefined): p is number {
  return p != null && Number.isFinite(Number(p));
}

export function aggregateTradeHistoryStats(
  trades: TradeRowWithPnl[],
): TradeHistoryAggregates {
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let noRealizedPnlCount = 0;
  let totalRealizedPnl = 0;

  for (const t of trades) {
    const p = t.realized_pnl;
    if (!hasNumericPnl(p)) {
      noRealizedPnlCount += 1;
      continue;
    }
    const n = Number(p);
    totalRealizedPnl += n;
    if (n > 0) winCount += 1;
    else if (n < 0) lossCount += 1;
    else breakevenCount += 1;
  }

  const withRealized = winCount + lossCount + breakevenCount;
  const winRateRealizedPct =
    withRealized > 0 ? Math.round((winCount / withRealized) * 100) : null;

  return {
    rowCount: trades.length,
    winCount,
    lossCount,
    breakevenCount,
    noRealizedPnlCount,
    totalRealizedPnl,
    winRateRealizedPct,
  };
}
