import { effectivePnlDelta } from "@/lib/trading/build-trading-analytics";
import type { Trade } from "@/lib/trading-api";

/** Effektiv P&L-delta for én handel (realisert P&L eller signert notional). */
export function effectiveDeltaForApiTrade(t: Trade): number {
  return effectivePnlDelta({
    id: t.id,
    trading_pair: t.symbol,
    side: t.side,
    realized_pnl: t.realized_pnl,
    mode: t.mode,
    created_at: t.created_at,
    executed_at: t.executed_at,
    total_value: t.total_value,
  });
}

export function sumEffectivePnlSince(trades: Trade[], sinceMs: number): number {
  let s = 0;
  for (const t of trades) {
    const ts = new Date(t.executed_at || t.created_at).getTime();
    if (!Number.isFinite(ts) || ts < sinceMs) continue;
    // Use realized_pnl only — effectivePnlDelta fallback treats buys as losses
    // for open positions, giving incorrect negative P&L in paper trading.
    const pnl = t.realized_pnl;
    if (pnl != null && Number.isFinite(Number(pnl))) {
      s += Number(pnl);
    }
  }
  return Math.round(s * 100) / 100;
}

// NOTE: winRateEffective removed — use getUserDashboardMetrics (SSoT) instead.
// effectiveDeltaForApiTrade fallback treats open-position buys as losses,
// producing incorrect win rates for paper trading.
