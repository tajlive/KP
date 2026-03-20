/**
 * Win rate from closed paper trades with non-null realized PnL.
 * Used when `trading_sessions.winning_trades` is missing or stale.
 */
export type TradeWithPnl = {
  mode?: string;
  realized_pnl?: number | null;
};

export function winRateFromRealizedTrades(
  trades: TradeWithPnl[],
): number | null {
  const closed = trades.filter(
    (t) =>
      String(t.mode ?? "paper").toLowerCase() === "paper" &&
      t.realized_pnl != null &&
      Number.isFinite(Number(t.realized_pnl)),
  );
  if (closed.length === 0) return null;
  const wins = closed.filter((t) => Number(t.realized_pnl) > 0).length;
  return Math.round((wins / closed.length) * 100);
}
