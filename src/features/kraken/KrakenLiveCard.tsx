"use client";

/**
 * Kraken Live-kort — vises kun for brukere med kraken_live_state.
 * Paper-brukere ser ikke dette (rendres kun når connected=true).
 * Nybegynner-språk: støvsuger-metaforen, alle tall forklart.
 */
import { useEffect, useState } from "react";

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
  if (!state) return null;
  if (!state.connected) return null; // papir-bruker: ingenting vises

  const orders = state.snapshot?.orders ?? [];
  const byPair = new Map<string, Order[]>();
  for (const o of orders) {
    if (!byPair.has(o.pair)) byPair.set(o.pair, []);
    byPair.get(o.pair)!.push(o);
  }

  const fmt = (n: number) =>
    n.toLocaleString("nb-NO", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">🟢 Kraken Live — ekte penger</h3>
        <span className="text-xs text-muted-foreground">
          Oppdatert {state.updated_at ? new Date(state.updated_at).toLocaleTimeString("nb-NO") : "—"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total verdi</p>
          <p className="text-xl font-bold">{fmt(state.total_usdc ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Realisert gevinst</p>
          <p className={`text-xl font-bold ${(state.realized_profit_usdc ?? 0) > 0 ? "text-emerald-500" : ""}`}>
            {fmt(state.realized_profit_usdc ?? 0)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {state.open_buy_orders ?? 0} støvsugere venter på kjøp · {state.open_sell_orders ?? 0} venter på salg
      </p>

      {byPair.size > 0 && (
        <div className="mt-3 space-y-2">
          {[...byPair.entries()].map(([pair, ords]) => {
            const buys = ords.filter((o) => o.side === "buy").length;
            const sells = ords.filter((o) => o.side === "sell").length;
            return (
              <div key={pair} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-xs">
                <span className="font-medium">{pair}</span>
                <span className="text-muted-foreground">
                  {buys} kjøp-nivåer · {sells} salg-nivåer
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Støvsugere ligger på faste prisnivåer. Faller prisen dit, kjøper vi litt. Stiger den 2%, selger vi med gevinst.
      </p>
    </div>
  );
}
