"use client";

/**
 * Kraken Live-kort — vises kun for brukere med kraken_live_state.
 * Paper-brukere ser ikke dette (rendres kun når connected=true).
 * Nybegynner-språk: støvsuger-metaforen, alle tall forklart.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, XCircle, ShieldAlert } from "lucide-react";

interface Order {
  txid: string;
  pair: string;
  side: "buy" | "sell";
  price: number;
  volume: number;
  filled: number;
  status: string;
}

interface LiveState {
  connected: boolean;
  total_usdc?: number;
  open_orders?: number;
  open_buy_orders?: number;
  open_sell_orders?: number;
  realized_profit_usdc?: number;
  base_holdings?: Record<string, { amount: string; usdcValue: number }>;
  snapshot?: { balance?: Record<string, string>; orders?: Order[]; fetchedAt?: string };
  updated_at?: string;
}

const PAIR_LABELS: Record<string, string> = {
  BTCUSDC: "Bitcoin",
  XBTUSDC: "Bitcoin",
  ETHUSDC: "Ethereum",
  SOLUSDC: "Solana",
};

export default function KrakenLiveCard() {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kraken/live-state")
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => setError("Kunne ikke hente live-status"));
  }, []);

  if (error) return null; // stille feil — ikke skrem nybegynnere
  if (!state) {
    return (
      <div className="mb-4 rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laster Kraken-tilkobling...
        </div>
      </div>
    );
  }
  if (!state.connected) return null; // papir-bruker: ingenting vises

  const orders = state.snapshot?.orders ?? [];
  const byPair = new Map<string, Order[]>();
  for (const o of orders) {
    if (!byPair.has(o.pair)) byPair.set(o.pair, []);
    byPair.get(o.pair)!.push(o);
  }

  const fmtUsd = (n: number) =>
    `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const totalUsdc = state.total_usdc ?? 0;
  const profit = state.realized_profit_usdc ?? 0;
  const buyCount = state.open_buy_orders ?? 0;
  const sellCount = state.open_sell_orders ?? 0;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-[#0F172A]/80 p-5 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            🟢 Kraken Live — ekte penger
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            LIVE
          </span>
        </div>
        <span className="text-[11px] text-gray-500">
          Oppdatert{" "}
          {state.updated_at
            ? new Date(state.updated_at).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "—"}
        </span>
      </div>

      {/* Hovedkort */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1220] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Total verdi
          </p>
          <p className="mt-1 text-xl font-bold text-white tabular-nums">
            {fmtUsd(totalUsdc)}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Alt du har på Kraken akkurat nå
          </p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1220] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Gevinst så langt
          </p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums ${
              profit > 0
                ? "text-emerald-400"
                : profit < 0
                  ? "text-red-400"
                  : "text-gray-300"
            }`}
          >
            {profit > 0 ? "+" : ""}
            {fmtUsd(profit)}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Fra fullførte støvsugere
          </p>
        </div>
      </div>

      {/* Støvsuger-status */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="rounded-md bg-green-900/30 px-2 py-0.5 font-medium text-green-400">
          {buyCount} kjøp venter
        </span>
        <span className="rounded-md bg-red-900/30 px-2 py-0.5 font-medium text-red-400">
          {sellCount} salg venter
        </span>
        <span className="text-gray-500">
          {buyCount + sellCount} støvsugere totalt
        </span>
      </div>

      {/* Per par — klikkbar: går til Pilot-fanen for detaljer */}
      {byPair.size > 0 && (
        <div className="mt-3 space-y-2">
          {[...byPair.entries()].map(([pair, ords]) => {
            const buys = ords.filter((o) => o.side === "buy").length;
            const sells = ords.filter((o) => o.side === "sell").length;
            return (
              <Link
                key={pair}
                href={`/handel?tab=pilot&symbol=${encodeURIComponent(pair)}`}
                className="flex items-center justify-between rounded-lg border border-[#1E293B] bg-[#0B1220]/60 px-3 py-2.5 transition hover:border-[#334155] hover:bg-[#0B1220]/80"
              >
                <span className="text-sm font-medium text-white">
                  {PAIR_LABELS[pair] ?? pair}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">{buys} kjøp</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-red-400">{sells} salg</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Forklaring */}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
        Støvsugere ligger på faste prisnivåer. Faller prisen dit, kjøper vi
        litt. Stiger den 2 %, selger vi med gevinst.
      </p>
    </div>
  );
}
