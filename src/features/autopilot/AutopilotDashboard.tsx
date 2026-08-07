"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface GridLevelEntry {
  txid?: string;
  side: "buy" | "sell";
  pair: string;
  price: number;
  volume: string;
  status: "open" | "filled" | "cancelled";
}

interface AutopilotState {
  activated: boolean;
  initial_equity_usdc?: number | string;
  current_equity_usdc?: number | string;
  realized_profit_usdc?: number | string;
  grid_levels?: Record<string, GridLevelEntry[]>;
  drawdown_kill?: boolean;
  five_pair_activated?: boolean;
  updated_at?: string;
  last_run?: string;
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatPct(current: number, initial: number): string {
  const pct = ((current - initial) / initial) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function AutopilotDashboard({ userId }: { userId: string }) {
  const [state, setState] = useState<AutopilotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kraken/autopilot-state")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setState(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laster Kraken-tilkobling...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <XCircle className="h-4 w-4" />
          Kunne ikke hente Kraken-status
        </div>
        <div className="mt-1 text-xs text-gray-500">{error}</div>
      </div>
    );
  }

  if (!state?.activated) {
    return (
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <XCircle className="h-4 w-4" />
          Ingen Kraken-tilkobling
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Koble Kraken for å starte autopilot. Gå til innstillinger → Koble
          børs.
        </div>
      </div>
    );
  }

  const eq = Number(state.current_equity_usdc ?? 0);
  const initial = Number(state.initial_equity_usdc ?? eq);
  const profit = Number(state.realized_profit_usdc ?? 0);
  const gridLevels = state.grid_levels ?? {};
  const allLevels = Object.values(gridLevels).flat();
  const totalLevels = allLevels.length;
  const pairCount = Object.keys(gridLevels).length || 3;
  const kill = state.drawdown_kill;

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-blue-400">
            🤖 Kraken Autopilot
          </h3>
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kill ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}
        >
          {kill ? "STOPPET" : "AKTIV"}
        </span>
      </div>

      {/* Equity + endring */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#1E293B]/50 p-3">
          <div className="mb-1 text-[11px] text-gray-500">Equity</div>
          <div className="text-lg font-bold text-white">{formatUsd(eq)}</div>
          <div
            className={`text-xs ${eq >= initial ? "text-green-400" : "text-red-400"}`}
          >
            {formatPct(eq, initial)}
          </div>
        </div>
        <div className="rounded-xl bg-[#1E293B]/50 p-3">
          <div className="mb-1 text-[11px] text-gray-500">Realisert</div>
          <div
            className={`text-lg font-bold ${profit > 0 ? "text-green-400" : profit < 0 ? "text-red-400" : "text-gray-400"}`}
          >
            {formatUsd(profit)}
          </div>
          <div className="text-xs text-gray-500">
            {totalLevels} nivåer · {pairCount} par
          </div>
        </div>
      </div>

      {/* Kill-switch advarsel */}
      {kill && (
        <div className="mb-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-400">
          ⛔ Drawdown-kill utløst — all handel stoppet.
        </div>
      )}

      {/* Grid-nivåer per par */}
      {totalLevels > 0 &&
        Object.entries(gridLevels).map(([pair, entries]) => {
          const buys = entries.filter(
            (e) => e.side === "buy" && e.status === "open",
          );
          const sells = entries.filter(
            (e) => e.side === "sell" && e.status === "open",
          );
          return (
            <div key={pair} className="mb-2">
              <div className="text-[11px] font-medium text-gray-500 mb-1">
                {pair} · {entries.length} nivåer · {buys.length} kjøp ·{" "}
                {sells.length} salg
              </div>
              {entries.slice(0, 4).map((e, i) => (
                <div
                  key={e.txid || `${pair}-${i}`}
                  className="flex items-center justify-between rounded bg-[#1E293B]/30 px-3 py-1 mb-1 text-xs"
                >
                  <span
                    className={
                      e.side === "buy" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {e.side === "buy" ? "KJØP" : "SALG"}
                  </span>
                  <span className="font-mono text-white">
                    ${Number(e.price).toFixed(2)}
                  </span>
                  <span
                    className={`${e.status === "open" ? "text-blue-400" : e.status === "filled" ? "text-green-400" : "text-gray-500"}`}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
              {entries.length > 4 && (
                <div className="text-[10px] text-gray-600 pl-1">
                  +{entries.length - 4} til...
                </div>
              )}
            </div>
          );
        })}

      {/* Footer */}
      <div className="mt-3 border-t border-[#1E293B] pt-2 text-[10px] text-gray-600">
        Sist oppdatert:{" "}
        {state.updated_at
          ? new Date(state.updated_at).toLocaleTimeString("nb-NO")
          : "—"}
      </div>
    </div>
  );
}
