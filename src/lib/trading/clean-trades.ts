/**
 * Ren trade-data — ÉN kilde for UI-tall (forurensings-cutoff + oversell-clamp).
 *
 * PROMPT #16 Del 1: «aldri samme feil to ganger»-fiksen. Alle UI-ruter som
 * viser trade-baserte tall (trading-analytics, portfolio/summary) skal hente
 * trades gjennom getCleanTrades() og regne P&L gjennom clampedRealizedPnl() /
 * cleanTradeStats(). Da er cutoff (2026-07-30) og oversell-clamp (sell ≤
 * akkumulert buy per posisjon) definert ÉN gang — aldri per-rute.
 *
 * Bakgrunn: trades fra før 2026-07-30 inneholder inflated realized_pnl fra
 * oversell-buggen (sell > buy uten posisjon). Samme cutoff brukes i
 * klarpakke-trading-agent-skillen. Risikometrikker og pengetall skal ALDRI
 * baseres på forurensede data.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { normalizePair } from "./pair";

/** Forurensings-cutoff: trades før dette tidspunktet kan ha fake realized_pnl. */
export const CONTAMINATION_CUTOFF = "2026-07-30T00:00:00.000Z";

export type CleanTrade = {
  id: string;
  session_id: string | null;
  trading_pair: string;
  side: string;
  realized_pnl: number | null;
  quantity: number | null;
  price: number | null;
  mode: string | null;
  created_at: string;
  executed_at: string | null;
  total_value: number | null;
};

type TradesRow = Database["public"]["Tables"]["trades"]["Row"];
type TradesSelect = Pick<
  TradesRow,
  | "id"
  | "session_id"
  | "trading_pair"
  | "side"
  | "realized_pnl"
  | "quantity"
  | "price"
  | "mode"
  | "created_at"
  | "executed_at"
  | "total_value"
>;

export type GetCleanTradesOptions = {
  /** Maks antall rader (nyeste først). */
  limit?: number;
  /** Filtrer på mode (f.eks. "paper"). */
  mode?: Database["public"]["Enums"]["trading_mode"];
  /** Filtrer på status (f.eks. "filled"). */
  status?: Database["public"]["Enums"]["trade_status"];
};

const TRADE_COLUMNS =
  "id, session_id, trading_pair, side, realized_pnl, quantity, price, mode, created_at, executed_at, total_value";

// NUMERIC-kolonner kommer som JSON-strenger fra supabase-js — kast til Number.
function toNullableNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(row: TradesSelect): CleanTrade {
  return {
    id: row.id,
    session_id: row.session_id,
    trading_pair: row.trading_pair,
    side: row.side,
    realized_pnl: toNullableNumber(row.realized_pnl),
    quantity: toNullableNumber(row.quantity),
    price: toNullableNumber(row.price),
    mode: row.mode,
    created_at: row.created_at,
    executed_at: row.executed_at ?? null,
    total_value: toNullableNumber(row.total_value),
  };
}

/**
 * Hent rene trades for en bruker: alltid med forurensings-cutoff
 * (executed_at >= CONTAMINATION_CUTOFF) og valgfritt sesjonsfilter.
 *
 * @param sessionIds Utelatt = alle sesjoner. Tom liste = ingen treff
 *   (samme «__none__»-mønster som de gamle rutene).
 * @throws Error ved Supabase-feil — kallet logg og returner 500 selv.
 */
export async function getCleanTrades(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionIds?: string[],
  options: GetCleanTradesOptions = {},
): Promise<CleanTrade[]> {
  let query = supabase
    .from("trades")
    .select(TRADE_COLUMNS)
    .eq("user_id", userId)
    .gte("executed_at", CONTAMINATION_CUTOFF);

  if (sessionIds !== undefined) {
    query = query.in(
      "session_id",
      sessionIds.length > 0 ? sessionIds : ["__none__"],
    );
  }
  if (options.mode !== undefined) {
    query = query.eq("mode", options.mode);
  }
  if (options.status !== undefined) {
    query = query.eq("status", options.status);
  }
  // Deterministic: nyeste først. Rekkefølgen spiller ingen rolle for
  // clampedRealizedPnl — den sorterer kronologisk internt per posisjon.
  query = query.order("created_at", { ascending: false });
  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(normalizeRow);
}

function tradeTimestamp(t: CleanTrade): string {
  return t.executed_at ?? t.created_at;
}

/**
 * Per-trade clamped realized P&L, keyed på trade-id. Én verdi per trade —
 * buy-rader og handler uten pnl får null, salg får pnl skalert mot dekning.
 *
 * Clamp-regel (samme LEAST(sold, bought)-semantikk som ledger-rekalken i
 * klarpakke-trading-data-cleanup): et salg kan ikke overstige akkumulert kjøp
 * for samme posisjon (session_id + normalisert par). Den udekkede andelen av
 * salget har ingen kostgrunnlag — dens pnl er inflasjon fra oversell-buggen
 * og skaleres bort proporsjonalt. Salg uten gyldig quantity kan ikke
 * verifiseres og beholdes uendret (konservativt — ingen falsk skade).
 */
export function clampedRealizedPnl(trades: CleanTrade[]): Map<string, number | null> {
  const clamped = new Map<string, number | null>();

  // Posisjon = (session_id, normalisert par) — grupper først.
  const groups = new Map<string, CleanTrade[]>();
  for (const t of trades) {
    const key = `${t.session_id ?? "__no_session__"}::${normalizePair(t.trading_pair)}`;
    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const byTime = tradeTimestamp(a).localeCompare(tradeTimestamp(b));
      if (byTime !== 0) return byTime;
      const byCreated = a.created_at.localeCompare(b.created_at);
      if (byCreated !== 0) return byCreated;
      return a.id.localeCompare(b.id);
    });

    let accumulatedBuy = 0;
    for (const t of sorted) {
      const qty = t.quantity ?? 0;

      if (t.side === "buy") {
        if (qty > 0) accumulatedBuy += qty;
        clamped.set(t.id, t.realized_pnl);
      } else if (t.side === "sell") {
        let pnl = t.realized_pnl;
        if (qty > 0 && pnl != null) {
          const covered = Math.min(qty, accumulatedBuy);
          pnl = pnl * (covered / qty); // 0..1 — oversell skaleres bort
        }
        clamped.set(t.id, pnl);
        accumulatedBuy = Math.max(0, accumulatedBuy - qty);
      } else {
        // Ukjent side — aldri clamp (skal ikke forekomme for trades).
        clamped.set(t.id, t.realized_pnl);
      }
    }
  }

  return clamped;
}

export type CleanTradeStats = {
  /** Antall handler med kjent (clamped) realisert P&L. */
  closedCount: number;
  winCount: number;
  lossCount: number;
  /** Vinnrate 0–1 blant lukkede handler; null hvis ingen. */
  winRate: number | null;
  /** Sum av clamped realisert P&L (kun lukkede handler). */
  totalPnl: number;
};

/** Aggregerte statistikker basert på clamped verdier — aldri rå realized_pnl. */
export function cleanTradeStats(trades: CleanTrade[]): CleanTradeStats {
  let winCount = 0;
  let lossCount = 0;
  let closedCount = 0;
  let totalPnl = 0;

  for (const pnl of clampedRealizedPnl(trades).values()) {
    if (pnl == null) continue;
    closedCount += 1;
    totalPnl += pnl;
    if (pnl > 0) winCount += 1;
    else if (pnl < 0) lossCount += 1;
  }

  return {
    closedCount,
    winCount,
    lossCount,
    winRate: closedCount > 0 ? winCount / closedCount : null,
    totalPnl: Math.round(totalPnl * 100) / 100,
  };
}
