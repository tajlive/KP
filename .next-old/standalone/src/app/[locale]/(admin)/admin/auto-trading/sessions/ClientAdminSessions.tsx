"use client";

import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  StopCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface AdminSession {
  id: string;
  user_id: string;
  mode: string;
  status: string;
  strategy_id: string;
  trading_pair: string;
  current_capital: number;
  initial_capital: number;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  last_heartbeat: string;
  started_at: string;
  stopped_at: string | null;
  user_profiles: {
    display_name: string;
    tier: string;
  } | null;
}

export default function ClientAdminSessions() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const t = useTranslations("AdminSessions");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sessions");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch sessions");
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t("unknownError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    sessionId: string,
    action: "stop" | "pause" | "resume",
  ) => {
    if (
      action === "stop" &&
      !window.confirm(t("confirmStopBot"))
    )
      return;

    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Failed to ${action} session`);

      toast.success(data.message);
      fetchSessions();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t("unknownError"));
      }
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.user_profiles?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      session.trading_pair.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Trading Sessions
          </h1>
          <p className="text-slate-400">
            Oversikt over alle aktive og stoppede roboter i systemet
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchSessions")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="stopped">{t("statusStopped")}</option>
          <option value="crashed">{t("statusCrashed")}</option>
          <option value="paused">{t("statusPaused")}</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  Session ID
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  Bruker
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  Strategi
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  ROI / PNL
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  Status
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-slate-400">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <span className="text-slate-500 font-mono text-xs">
                      {session.id.slice(0, 8)}...
                    </span>
                    <div className="text-[10px] text-slate-600 mt-1 uppercase">
                      {session.mode}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-white">
                      {session.user_profiles?.display_name || t("unknown")}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {session.user_profiles?.tier || "student"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-white">
                      {session.strategy_id}
                    </div>
                    <div className="text-xs text-emerald-400">
                      {session.trading_pair}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div
                      className={`text-sm font-medium ${session.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {session.total_pnl >= 0 ? "+" : ""}
                      {session.total_pnl} NOK
                    </div>
                    <div className="text-xs text-slate-500">
                      Cap: {session.current_capital.toFixed(0)} NOK
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {session.status === "active" && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded">
                        <Activity className="w-3 h-3" /> Active
                      </span>
                    )}
                    {session.status === "stopped" && (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs bg-slate-400/10 px-2 py-1 rounded">
                        <StopCircle className="w-3 h-3" /> {t("stop")}ed
                      </span>
                    )}
                    {session.status === "crashed" && (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs bg-red-400/10 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" /> Crashed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {session.status === "active" && (
                        <>
                          <button
                            onClick={() => handleAction(session.id, "pause")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition-colors text-xs font-medium"
                          >
                            ⏸ Pause
                          </button>
                          <button
                            onClick={() => handleAction(session.id, "stop")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors text-xs font-medium"
                          >
                            <StopCircle className="w-3 h-3" /> Stopp
                          </button>
                        </>
                      )}
                      {session.status === "paused" && (
                        <button
                          onClick={() => handleAction(session.id, "resume")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                        >
                          ▶ Gjenoppta
                        </button>
                      )}
                      {session.status === "stopped" && (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSessions.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Ingen trading sessions funnet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
