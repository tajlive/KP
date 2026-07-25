/**
 * Beregn åpne posisjoner fra trade-historikk (FIFO per normalisert par).
 *
 * Brukes av /api/user/trades til UI-A (posisjonskort m/ urealisert P&L).
 * Ren funksjon — pris hentes i ruten og legges på der.
 */
import { normalizePair } from "./pair";

export interface TradeForPosition {
  side: string;
  quantity: number | null;
  price: number | null;
  trading_pair: string | null;
  created_at: string | null;
}

export interface ComputedPosition {
  pair: string;
  quantity: number;
  avg_entry_price: number;
  cost_basis_nok: number;
  oldest_entry_at: string;
}

interface FifoLot {
  quantity: number;
  price: number;
  time: string;
}

export function computePositionsFromTrades(
  trades: TradeForPosition[],
): ComputedPosition[] {
  const lotsByPair = new Map<string, FifoLot[]>();

  // Sorter stigende på tid — FIFO forutsetter kronologisk rekkefølge
  const sorted = [...trades].sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );

  for (const trade of sorted) {
    const qty = Number(trade.quantity);
    const price = Number(trade.price);
    if (!trade.trading_pair || !Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(price) || price <= 0) continue;

    const pair = normalizePair(trade.trading_pair);
    const lots = lotsByPair.get(pair) ?? [];
    if (!lotsByPair.has(pair)) lotsByPair.set(pair, lots);

    if (trade.side === "buy") {
      lots.push({
        quantity: qty,
        price,
        time: trade.created_at ?? "",
      });
    } else if (trade.side === "sell") {
      let remaining = qty;
      while (remaining > 0 && lots.length > 0) {
        const head = lots[0];
        if (head.quantity <= remaining) {
          remaining -= head.quantity;
          lots.shift();
        } else {
          head.quantity -= remaining;
          remaining = 0;
        }
      }
      // Overskytende salg (mer enn beholdning) ignoreres — clampet til 0
    }
  }

  const positions: ComputedPosition[] = [];
  for (const [pair, lots] of lotsByPair) {
    const quantity = lots.reduce((s, l) => s + l.quantity, 0);
    if (quantity <= 0) continue;
    const costBasis = lots.reduce((s, l) => s + l.quantity * l.price, 0);
    positions.push({
      pair,
      quantity,
      avg_entry_price: costBasis / quantity,
      cost_basis_nok: costBasis,
      oldest_entry_at: lots[0]?.time ?? "",
    });
  }

  // Størst kostgrunnlag først
  return positions.sort((a, b) => b.cost_basis_nok - a.cost_basis_nok);
}
