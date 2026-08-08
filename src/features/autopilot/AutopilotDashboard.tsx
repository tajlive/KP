"use client";

import { Loader2, CheckCircle2, XCircle, ShieldAlert, Bot, TrendingUp, TrendingDown } from "lucide-react";
import { useAutopilotRealtime } from "@/lib/realtime/autopilot-channel";

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
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(current: number, initial: number): string {
  if (!initial) return "+0.00%";
  const pct = ((current - initial) / initial) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

const PAIR_LABELS: Record<string, string> = {
  XBTUSDC: "Bitcoin",
  BTCUSDC: "Bitcoin",
  ETHUSDC: "Ethereum",
  SOLUSDC: "Solana",
};

export function AutopilotDashboard({ userId }: { userId: string }) {
  const { state: realtimeState, isLive, error, hasLoaded } =
    useAutopilotRealtime(userId);

  // Map Realtime state to component state
  const state: AutopilotState | null = realtimeState
    ? {
        activated: realtimeState.activated,
        initial_equity_usdc: realtimeState.initial_equity_usdc,
        current_equity_usdc: realtimeState.current_equity_usdc,
        realized_profit_usdc: realtimeState.realized_profit_usdc,
        grid_levels: realtimeState.grid_levels as unknown as Record<
          string,
          GridLevelEntry[]
        >,
        drawdown_kill: realtimeState.drawdown_kill,
        five_pair_activated: realtimeState.five_pair_activated,
        updated_at: realtimeState.updated_at,
        last_run: realtimeState.last_run ?? undefined,
      }
    : null;

  const loading = !hasLoaded;

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
  const openLevels = allLevels.filter((e) => e.status === "open").length;
  const pairCount = Object.keys(gridLevels).length;
  const kill = state.drawdown_kill;
  const pctChange = formatPct(eq, initial);
  const isUp = eq >= initial;

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            🤖 Kraken Autopilot
          </h3>
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
              VENTENDE
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            kill
              ? "bg-red-900/50 text-red-400"
              : "bg-green-900/50 text-green-400"
          }`}
        >
          {kill ? "STOPPET" : "AKTIV"}
        </span>
      </div>

      {/* Hovedkort: Total verdi + Gevinst */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1220] p-4">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Total verdi
          </div>
          <div className="text-xl font-bold text-white tabular-nums">
            {formatUsd(eq)}
          </div>
          <div
            className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${
              isUp ? "text-green-400" : "text-red-400"
            }`}
          >
            {isUp ? "▲" : "▼"} {pctChange} siden start
          </div>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1220] p-4">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Gevinst så langt
          </div>
          <div
            className={`text-xl font-bold tabular-nums ${
              profit > 0
                ? "text-green-400"
                : profit < 0
                  ? "text-red-400"
                  : "text-gray-300"
            }`}
          >
            {profit > 0 ? "+" : ""}
            {formatUsd(profit)}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            {totalLevels} ordrer · {pairCount} par
          </div>
        </div>
      </div>

      {/* Kill-switch advarsel */}
      {kill && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Drawdown-kill utløst</div>
            <div className="mt-0.5 text-red-400/80">
              All handel er stoppet for å beskytte pengene dine.
            </div>
          </div>
        </div>
      )}

      {/* Ordre per par */}
      {totalLevels > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(gridLevels).map(([pair, entries]) => {
            const buys = entries.filter(
              (e) => e.side === "buy" && e.status === "open",
            ).length;
            const sells = entries.filter(
              (e) => e.side === "sell" && e.status === "open",
            ).length;
            const filled = entries.filter((e) => e.status === "filled").length;
            return (
              <div
                key={pair}
                className="flex items-center justify-between rounded-lg border border-[#1E293B] bg-[#0B1220]/60 px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {PAIR_LABELS[pair] ?? pair}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {buys} kjøpsordre · {sells} salgsordre
                    {filled > 0 ? ` · ${filled} utført` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-400">
                    {buys} kjøp
                  </span>
                  <span className="rounded-md bg-red-900/30 px-2 py-0.5 text-[11px] font-medium text-red-400">
                    {sells} salg
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forklaring */}
      <div className="mb-4 rounded-lg bg-[#1E293B]/30 p-3 text-xs leading-relaxed text-gray-400">
        Autopiloten handler som støvsugere på prisnivåer: den kjøper når
        prisen faller til et nivå, og selger når den stiger igjen. {openLevels}{" "}
        ordre venter akkurat nå på at prisen skal treffe dem.
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#1E293B] pt-2.5 text-[11px] text-gray-600">
        <span>
          Sist oppdatert:{" "}
          {state.updated_at
            ? new Date(state.updated_at).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "—"}
        </span>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-green-500/70">
            <CheckCircle2 className="h-3 w-3" /> Sanntid
          </span>
        )}
      </div>
    </div>
  );
}
