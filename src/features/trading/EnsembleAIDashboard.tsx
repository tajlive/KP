"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Brain, TrendingUp, Activity, Target, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type AgentStat = Database["public"]["Tables"]["ai_agent_stats"]["Row"];
type TradingSignal = Database["public"]["Tables"]["trading_signals"]["Row"];
type FeatureRow = Database["public"]["Tables"]["ai_feature_store"]["Row"];

interface EnsembleAIDashboardProps {
  lang?: string;
}

export default function EnsembleAIDashboard({ lang = "no" }: EnsembleAIDashboardProps) {
  const [stats, setStats] = useState<AgentStat[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const db = createClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: s }, { data: sig }, { data: feat }] = await Promise.all([
      db.from("ai_agent_stats").select("*").eq("timeframe", "1h").order("updated_at", { ascending: false }),
      db
        .from("trading_signals")
        .select("*")
        .eq("signal_type", "ensemble_ai")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("ai_feature_store")
        .select("*")
        .eq("timeframe", "1h")
        .order("as_of", { ascending: false })
        .limit(20),
    ]);

    setStats((s as AgentStat[]) ?? []);
    setSignals((sig as TradingSignal[]) ?? []);
    setFeatures((feat as FeatureRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Group signals by symbol, take latest master per symbol
  const latestMasterBySymbol = new Map<string, TradingSignal>();
  const agentSignalsByRun = new Map<string, TradingSignal[]>();
  for (const sig of signals) {
    if (sig.agent_id === "ensemble_master" && !latestMasterBySymbol.has(sig.symbol)) {
      latestMasterBySymbol.set(sig.symbol, sig);
    }
    if (sig.ensemble_run_id) {
      const arr = agentSignalsByRun.get(sig.ensemble_run_id) ?? [];
      arr.push(sig);
      agentSignalsByRun.set(sig.ensemble_run_id, arr);
    }
  }

  const masterSignals = Array.from(latestMasterBySymbol.values()).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-linear-to-r from-indigo-500/10 to-blue-900/20 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {lang === "en" ? "Ensemble AI" : "Ensemble AI"}
            </h2>
            <p className="text-slate-400 text-sm">
              {lang === "en"
                ? "Multi-agent consensus engine with dynamic weights"
                : "Multi-agent konsensusmotor med dynamiske vekter"}
            </p>
          </div>
        </div>
      </div>

      {/* Top row: Master signals + Agent stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Signals */}
        <Card className="bg-slate-900 border-slate-800 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              {lang === "en" ? "Latest Signals" : "Siste Signaler"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && masterSignals.length === 0 ? (
              <Skeleton className="h-20 w-full bg-slate-800" />
            ) : masterSignals.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {lang === "en" ? "No ensemble signals yet." : "Ingen ensemble-signaler ennå."}
              </p>
            ) : (
              masterSignals.map((sig) => {
                const agents = sig.ensemble_run_id ? agentSignalsByRun.get(sig.ensemble_run_id) ?? [] : [];
                const buyVotes = agents.filter((a) => a.action === "buy").length;
                const sellVotes = agents.filter((a) => a.action === "sell").length;
                const confidence = typeof sig.confidence === "number" ? sig.confidence : 0;
                return (
                  <div
                    key={sig.id}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{sig.symbol}</span>
                        <Badge
                          className={cn(
                            "text-[10px] uppercase",
                            sig.action === "buy"
                              ? "bg-green-500/10 text-green-400 border-green-500/30"
                              : sig.action === "sell"
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                          )}
                        >
                          {sig.action}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {sig.created_at ? new Date(sig.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "no-NO") : "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {lang === "en" ? "Confidence" : "Conf"}: {confidence.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {agents.length} {lang === "en" ? "agents" : "agenter"}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        {buyVotes}
                        <span className="text-slate-600">/</span>
                        <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                        {sellVotes}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Agent Stats */}
        <Card className="bg-slate-900 border-slate-800 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              {lang === "en" ? "Agent Performance" : "Agent Ytelse"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && stats.length === 0 ? (
              <Skeleton className="h-20 w-full bg-slate-800" />
            ) : stats.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {lang === "en"
                  ? "No stats yet. Metrics populate after a few signal cycles."
                  : "Ingen statistikk ennå. Metrikker fylles etter noen signal-sykluser."}
              </p>
            ) : (
              stats.map((st) => (
                <div
                  key={`${st.agent_id}-${st.timeframe}`}
                  className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white capitalize">
                      {st.agent_id.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {st.trades_count} {lang === "en" ? "signals" : "signaler"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">{lang === "en" ? "Win rate" : "Win rate"}</p>
                      <p className={cn("font-semibold", (st.win_rate ?? 0) >= 0.5 ? "text-green-400" : "text-red-400")}>
                        {((st.win_rate ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{lang === "en" ? "Avg return" : "Gj.snitt retur"}</p>
                      <p className={cn("font-semibold", (st.avg_r_multiple ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                        {((st.avg_r_multiple ?? 0) * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{lang === "en" ? "Drawdown" : "Drawdown"}</p>
                      <p className="font-semibold text-slate-200">
                        {((st.max_drawdown ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature snapshot */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            {lang === "en" ? "Feature Snapshot" : "Feature Snapshot"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && features.length === 0 ? (
            <Skeleton className="h-20 w-full bg-slate-800" />
          ) : features.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {lang === "en" ? "No feature data yet." : "Ingen feature-data ennå."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {features.slice(0, 10).map((f) => {
                const feat = (f.features ?? {}) as Record<string, number | null>;
                return (
                  <div
                    key={f.id}
                    className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50"
                  >
                    <p className="text-xs text-slate-500">{f.symbol}</p>
                    <p className="text-sm font-bold text-white">RSI {feat.rsi?.toFixed(1) ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">
                      SMA20 {feat.sma20?.toFixed(0) ?? "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
