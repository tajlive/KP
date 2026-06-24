"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { SURFACE } from "@/lib/design/tokens";
import {
  BrainCircuit,
  Pause,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Activity,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Session {
  id: string;
  pair: string;
  strategy: string;
  capital: { initial: number; current: number };
  trades: { total: number; winning: number; losing: number };
  pnl: number;
  has_open_position: boolean;
  last_tick_at: string | null;
}

interface AutopilotStatus {
  active: boolean;
  status: string;
  regime: {
    name: string;
    display: string;
  };
  strategy: {
    id: string;
    display: string;
  };
  capital: {
    total: number;
    allocated: number;
    current: number;
  };
  performance: {
    total_pnl_nok: number;
    total_pnl_pct: number;
    max_drawdown_pct: number;
    win_rate: number;
  };
  sessions: Session[];
  rebalance: {
    last: string | null;
    next: string | null;
  };
  started_at: string | null;
}

interface AutopilotMonitorProps {
  locale: string;
}

export function AutopilotMonitor({ locale }: AutopilotMonitorProps) {
  const t = useTranslations("autopilot");
  const router = useRouter();
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/ai/autopilot/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("[AutopilotMonitor] Status fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function handlePause() {
    setActionLoading(true);
    try {
      await fetch("/api/ai/autopilot/pause", { method: "POST" });
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      await fetch("/api/ai/autopilot/resume", { method: "POST" });
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    if (!confirm("Er du sikker på at du vil stoppe autopiloten? Alle aktive posisjoner lukkes.")) {
      return;
    }
    setActionLoading(true);
    try {
      await fetch("/api/ai/autopilot/stop", { method: "POST" });
      router.push(`/${locale}/dashboard`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${SURFACE.BG}`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!status || !status.active) {
    return (
      <div className={`max-w-xl mx-auto p-8 ${SURFACE.BG} rounded-2xl border border-white/10 text-center space-y-4`}>
        <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto" />
        <h2 className={`text-xl font-bold ${SURFACE.TEXT}`}>Ingen aktiv autopilot</h2>
        <p className={`${SURFACE.TEXT_MUTED}`}>
          Du har ingen aktiv autopilot. Aktiver en for å la AI trade for deg.
        </p>
        <Button
          onClick={() => router.push(`/${locale}/dashboard/autopilot`)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Aktiver Autopilot
        </Button>
      </div>
    );
  }

  const pnlPositive = (status.performance.total_pnl_pct ?? 0) >= 0;
  const pnlColor = pnlPositive ? "text-green-400" : "text-red-400";
  const PnlIcon = pnlPositive ? TrendingUp : TrendingDown;

  // Countdown to next rebalance
  const nextRebalance = status.rebalance.next ? new Date(status.rebalance.next) : null;
  const now = new Date();
  const hoursUntilRebalance = nextRebalance
    ? Math.max(0, Math.floor((nextRebalance.getTime() - now.getTime()) / (1000 * 60 * 60)))
    : null;

  return (
    <div className={`max-w-3xl mx-auto p-6 ${SURFACE.BG} rounded-2xl border border-white/10 space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${SURFACE.TEXT}`}>KlarBot Autopilot</h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                status.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}>
                <Activity className="w-3 h-3" />
                {status.status === "active" ? "Aktiv" : "Pauset"}
              </span>
              <span className={`text-xs ${SURFACE.TEXT_MUTED}`}>
                {status.regime.display}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {status.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={actionLoading}
              className="border-white/10 hover:bg-white/5"
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={actionLoading}
              className="border-white/10 hover:bg-white/5"
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={actionLoading}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Square className="w-4 h-4 mr-1" />
            Stopp
          </Button>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className={`text-xs ${SURFACE.TEXT_MUTED} mb-1`}>Total PnL</div>
          <div className={`text-xl font-bold ${pnlColor} flex items-center gap-1`}>
            <PnlIcon className="w-4 h-4" />
            {status.performance.total_pnl_pct >= 0 ? "+" : ""}
            {status.performance.total_pnl_pct?.toFixed(2) ?? "0.00"}%
          </div>
          <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>
            {status.performance.total_pnl_nok?.toLocaleString("no-NO") ?? "0"} NOK
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className={`text-xs ${SURFACE.TEXT_MUTED} mb-1`}>Win Rate</div>
          <div className={`text-xl font-bold ${SURFACE.TEXT}`}>
            {status.performance.win_rate?.toFixed(1) ?? "0.0"}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className={`text-xs ${SURFACE.TEXT_MUTED} mb-1`}>Max Drawdown</div>
          <div className={`text-xl font-bold text-red-400`}>
            -{status.performance.max_drawdown_pct?.toFixed(2) ?? "0.00"}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className={`text-xs ${SURFACE.TEXT_MUTED} mb-1`}>Neste rebalansering</div>
          <div className={`text-xl font-bold ${SURFACE.TEXT} flex items-center gap-1`}>
            <Clock className="w-4 h-4" />
            {hoursUntilRebalance !== null ? `${hoursUntilRebalance}t` : "—"}
          </div>
        </div>
      </div>

      {/* Strategy Info */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={`text-sm font-medium ${SURFACE.TEXT}`}>Strategi</div>
            <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>
              {status.strategy.display} ({status.regime.display})
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${SURFACE.TEXT}`}>Kapital</div>
            <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>
              {status.capital.current?.toLocaleString("no-NO") ?? "0"} /{" "}
              {status.capital.total?.toLocaleString("no-NO") ?? "0"} NOK
            </div>
          </div>
        </div>

        {/* Capital bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((status.capital.current ?? 0) / (status.capital.total ?? 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        <h3 className={`text-sm font-semibold ${SURFACE.TEXT}`}>Aktive sessions</h3>
        {status.sessions?.map((session) => (
          <div
            key={session.id}
            className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${session.has_open_position ? "bg-green-400" : "bg-white/30"}`} />
              <div>
                <div className={`text-sm font-medium ${SURFACE.TEXT}`}>{session.pair}</div>
                <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>
                  {session.strategy} · {session.trades.total} trades
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${session.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {session.pnl >= 0 ? "+" : ""}
                {session.pnl?.toLocaleString("no-NO", { maximumFractionDigits: 0 })} NOK
              </div>
              <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>
                {session.capital.current?.toLocaleString("no-NO")} NOK
              </div>
            </div>
          </div>
        ))}
        {(!status.sessions || status.sessions.length === 0) && (
          <div className={`text-sm ${SURFACE.TEXT_MUTED} text-center py-4`}>
            Ingen aktive sessions. Rebalansering oppretter nye.
          </div>
        )}
      </div>

      {/* Drawdown Warning */}
      {(status.performance.max_drawdown_pct ?? 0) >= 8 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400">
            Høy drawdown ({status.performance.max_drawdown_pct?.toFixed(1)}%). Autopilot pauser automatisk ved 10%.
          </p>
        </div>
      )}
    </div>
  );
}
