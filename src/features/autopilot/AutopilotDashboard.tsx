"use client";

import { useEffect, useState } from "react";

interface AutopilotState {
  activated: boolean;
  initial_equity_usdc?: number;
  current_equity_usdc?: number;
  realized_profit_usdc?: number;
  grid_levels?: Array<{ pair: string; price: number; qty: number }>;
  drawdown_kill?: boolean;
  five_pair_activated?: boolean;
  updated_at?: string;
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

  useEffect(() => {
    fetch("/api/kraken/autopilot-state")
      .then((r) => r.json())
      .then((d) => { setState(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!state?.activated) return null;

  const eq = state.current_equity_usdc ?? 0;
  const initial = state.initial_equity_usdc ?? eq;
  const profit = state.realized_profit_usdc ?? 0;
  const levels = state.grid_levels ?? [];
  const kill = state.drawdown_kill;

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-400">🤖 Kraken Autopilot</h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kill ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>
          {kill ? "STOPPET" : "AKTIV"}
        </span>
      </div>

      {/* Equity + endring */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#1E293B]/50 p-3">
          <div className="mb-1 text-[11px] text-gray-500">Equity</div>
          <div className="text-lg font-bold text-white">{formatUsd(eq)}</div>
          <div className={`text-xs ${eq >= initial ? "text-green-400" : "text-red-400"}`}>
            {formatPct(eq, initial)}
          </div>
        </div>
        <div className="rounded-xl bg-[#1E293B]/50 p-3">
          <div className="mb-1 text-[11px] text-gray-500">Realisert</div>
          <div className={`text-lg font-bold ${profit > 0 ? "text-green-400" : profit < 0 ? "text-red-400" : "text-gray-400"}`}>
            {formatUsd(profit)}
          </div>
          <div className="text-xs text-gray-500">
            {levels.length} nivåer · {state.five_pair_activated ? "5" : "3"} par
          </div>
        </div>
      </div>

      {/* Kill-switch advarsel */}
      {kill && (
        <div className="mb-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-400">
          ⛔ Drawdown-kill utløst — all handel stoppet. Kontakt support for manuell reset.
        </div>
      )}

      {/* Grid-nivåer (forenklet) */}
      {levels.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-gray-500">Kjøpsnivåer</div>
          {levels.slice(0, 5).map((l, i) => (
            <div key={`${l.pair}-${i}`} className="flex items-center justify-between rounded-lg bg-[#1E293B]/30 px-3 py-1.5 text-xs">
              <span className="text-gray-400">{l.pair.replace("USDC", "")}</span>
              <span className="font-mono text-white">
                ${typeof l.price === "number" ? l.price.toFixed(2) : Number(l.price).toFixed(2)}
              </span>
              <span className="text-gray-500">{typeof l.qty === "number" ? l.qty.toFixed(6) : Number(l.qty).toFixed(6)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 border-t border-[#1E293B] pt-2 text-[10px] text-gray-600">
        Sist oppdatert: {state.updated_at ? new Date(state.updated_at).toLocaleTimeString("nb-NO") : "—"}
      </div>
    </div>
  );
}
