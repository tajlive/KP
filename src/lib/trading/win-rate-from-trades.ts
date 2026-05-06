/**
 * Win rate from closed trades with non-null realized PnL.
 * Used when `trading_sessions.winning_trades` is missing or stale.
 */
export type TradeWithPnl = {
  mode?: string;
  realized_pnl?: number | null;
};

export function winRateFromRealizedTrades(
  trades: TradeWithPnl[],
  mode?: "paper" | "live" | "all",
): number | null {
  const modeFilter = mode ?? "paper";
  const closed = trades.filter(
    (t) =>
      (modeFilter === "all" || String(t.mode ?? "paper").toLowerCase() === modeFilter) &&
      t.realized_pnl != null &&
      Number.isFinite(Number(t.realized_pnl)),
  );
  if (closed.length === 0) return null;
  const wins = closed.filter((t) => Number(t.realized_pnl) > 0).length;
  return Math.round((wins / closed.length) * 100);
}
