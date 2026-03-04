"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Stats {
  total: number;
  active: number;
  paused: number;
  crashed: number;
  totalPnl: number;
}

interface Session {
  id: string;
  user_id: string;
  status: string;
  total_pnl: number;
  total_trades: number;
  mode: string;
  strategy_id: string;
  user_profiles: { display_name: string; tier: string } | null;
}

export default function AdminAutoTradingClient() {
  const locale = useLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sessions");
      const data = await res.json();
      if (data.success) setSessions(data.sessions || []);
    } catch {
      toast.error("Kunne ikke hente sesjoner");
    } finally {
      setLoading(false);
    }
  }

  async function triggerCron() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/cron-trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const result = data.result;
      toast.success(
        `Cron kjørt — ${result?.processed ?? 0} sesjoner behandlet`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Feil ved cron-trigger");
    } finally {
      setTriggering(false);
    }
  }

  const stats: Stats = sessions.reduce(
    (acc, s) => ({
      total: acc.total + 1,
      active: acc.active + (s.status === "active" ? 1 : 0),
      paused: acc.paused + (s.status === "paused" ? 1 : 0),
      crashed: acc.crashed + (s.status === "crashed" ? 1 : 0),
      totalPnl: acc.totalPnl + (s.total_pnl || 0),
    }),
    { total: 0, active: 0, paused: 0, crashed: 0, totalPnl: 0 }
  );

  const activeSessions = sessions.filter((s) => s.status === "active").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Auto-Trading Oversikt</h1>
          <p className="text-slate-400 text-sm mt-1">Platform-wide administrasjon</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
          <button
            onClick={triggerCron}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {triggering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Trigger Cron Manuelt
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5 text-emerald-400" />}
            label="Aktive Sesjoner"
            value={stats.active}
            color="emerald"
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-400" />}
            label="Totalt Sesjoner"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            label="Krasjet"
            value={stats.crashed}
            color="red"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            label="Total P&L"
            value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)} NOK`}
            color="amber"
          />
        </div>
      )}

      {/* Active sessions preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Aktive Sesjoner (topp 5)</h2>
          <Link
            href={`/${locale}/admin/auto-trading/sessions`}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
          >
            Se alle <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Ingen aktive sesjoner</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 text-left">Bruker</th>
                <th className="px-4 py-3 text-left">Strategi</th>
                <th className="px-4 py-3 text-left">Modus</th>
                <th className="px-4 py-3 text-right">P&L</th>
                <th className="px-4 py-3 text-right">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {activeSessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">
                      {s.user_profiles?.display_name || s.user_id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {s.user_profiles?.tier || "free"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{s.strategy_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium uppercase px-2 py-1 rounded bg-slate-700 text-slate-300">
                      {s.mode}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${s.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {s.total_pnl >= 0 ? "+" : ""}{s.total_pnl?.toFixed(0)} NOK
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-400">
                    {s.total_trades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/admin/auto-trading/sessions`}
          className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 transition-colors group"
        >
          <div>
            <div className="text-white font-medium">Alle Sesjoner</div>
            <div className="text-slate-500 text-sm mt-1">Stopp, pause, filtrer</div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </Link>
        <Link
          href={`/${locale}/admin/students`}
          className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 transition-colors group"
        >
          <div>
            <div className="text-white font-medium">Brukeradministrasjon</div>
            <div className="text-slate-500 text-sm mt-1">Oppgrader / nedgrader tier</div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-400/10",
    blue: "bg-blue-400/10",
    red: "bg-red-400/10",
    amber: "bg-amber-400/10",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className={`inline-flex p-2 rounded-lg ${bg[color]} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}
