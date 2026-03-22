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
    s += effectiveDeltaForApiTrade(t);
  }
  return Math.round(s * 100) / 100;
}

/** Win rate basert på effektiv delta (ikke bare realisert P&L). */
export function winRateEffective(trades: Trade[]): number | null {
  let wins = 0;
  let losses = 0;
  for (const t of trades) {
    const d = effectiveDeltaForApiTrade(t);
    if (d > 0) wins += 1;
    else if (d < 0) losses += 1;
  }
  const n = wins + losses;
  if (n === 0) return null;
  return Math.round((wins / n) * 100);
}
