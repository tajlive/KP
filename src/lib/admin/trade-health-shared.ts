import "server-only";

/**
 * Delte hjelpere for /api/admin/trade-health (GET + fix).
 * Samme klassifiseringslogikk som scripts/trade-quality-monitor.mjs.
 */

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", 
  XRP: "ripple", DOGE: "dogecoin", AVAX: "avalanche-2", ADA: "cardano", DOT: "polkadot",
};
const BAND_LO = 0.45, BAND_HI = 1.6, FALLBACK_RATE = 9.7;

export type PriceRef = Record<string, { usd: number; nok: number }>;

export interface TradeRow {
  id: string;
  user_id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  realized_pnl: number | null;
  usdt_nok_rate: number | null;
  is_mock: boolean | null;
  executed_at: string;
}

export async function fetchPriceRefs(): Promise<PriceRef> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,nok`,
    { signal: AbortSignal.timeout(10000) },
  );
  const json = (await res.json()) as Record<string, { usd?: number; nok?: number }>;
  const out: PriceRef = {};
  for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
    const row = json[id];
    if (row?.usd && row?.nok) out[sym] = { usd: row.usd, nok: row.nok };
  }
  return out;
}

export function baseSymbol(pair: string | null): string {
  const p = (pair ?? "").toUpperCase().replace("/", "");
  for (const s of ["USDT", "NOK", "USD", "BUSD"]) if (p.endsWith(s)) return p.slice(0, -s.length);
  return p;
}

/** Klassifiser valutaavvik for én rad. "full" = hele raden USDT, "mixed" = kun pris USDT. */
export function classifyCurrency(t: TradeRow, ref: PriceRef): "full" | "mixed" | "ambiguous" | null {
  const r = ref[baseSymbol(t.trading_pair)];
  if (!r) return null;
  const price = Number(t.price), qty = Number(t.quantity), tv = Number(t.total_value);
  if (!(price > 0) || !(qty > 0)) return null;
  const inUsdt = price >= r.usd * BAND_LO && price <= r.usd * BAND_HI;
  const inNok = price >= r.nok * BAND_LO && price <= r.nok * BAND_HI;
  const rate = Number(t.usdt_nok_rate) > 0 ? Number(t.usdt_nok_rate) : FALLBACK_RATE;
  const ratio = tv > 0 ? tv / (qty * price) : 1;
  const provesMixed = ratio > 4 && ratio < 16 &&
    ((Number(t.usdt_nok_rate) > 0 && Math.abs(ratio - rate) / rate < 0.2) || inUsdt);
  if (provesMixed) return "mixed";
  if (inUsdt && !inNok && ratio < 1.6) return "full";
  if (!inUsdt && !inNok) return "ambiguous";
  return null;
}

export { FALLBACK_RATE };
