"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { formatDistanceToNow } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Radio,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface TradingSignal {
  id: string;
  symbol: string;
  action: string | null;
  asset_name: string | null;
  confidence: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  signal_type: string | null;
  status: string | null;
  risk_level: number | null;
  reasoning: string | null;
  created_at: string | null;
}

const REFRESH_INTERVAL_MS = 15_000; // Oppdater oftere så nye signaler vises raskt

export function SignalFeed() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const { hasAccess, loading: subLoading } = useSubscription();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);

  const canSeeFullDetails = hasAccess("master");

  const fetchSignals = useCallback(async (showRefresh = false, fromRealtime = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("trading_signals")
        .select(
          "id, symbol, action, asset_name, confidence, entry_price, stop_loss, target_price, signal_type, status, risk_level, reasoning, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Failed to fetch trading signals:", error);
        return;
      }
      const next = (data as TradingSignal[]) ?? [];
      const prevCount = prevCountRef.current;
      prevCountRef.current = next.length;
      setSignals(next);
      setLastUpdated(new Date());
      if (fromRealtime && next.length > 0) {
        setLiveIndicator(true);
        const newest = next[0];
        const dir = newest.action?.toUpperCase() === "BUY" || newest.action?.toUpperCase() === "LONG" ? "Kjøp" : "Salg";
        toast.success(`Nytt signal: ${newest.symbol} ${dir}`, {
          description: newest.entry_price != null ? `Inngang ca. $${newest.entry_price.toLocaleString()}` : undefined,
        });
        setTimeout(() => setLiveIndicator(false), 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    intervalRef.current = setInterval(() => fetchSignals(), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSignals]);

  // Realtime: nye signaler dukker opp med en gang (hvis tabell er i realtime-publikasjon)
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("signal-feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trading_signals" },
        () => {
          fetchSignals(false, true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSignals]);

  if (loading || subLoading) {
    return (
      <div className="bg-slate-800/60 rounded-xl p-6 space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-slate-700 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-700/50 rounded-lg" />
        ))}
      </div>
    );
  }

  const isBuy = (action: string | null) =>
    action?.toUpperCase() === "BUY" || action?.toUpperCase() === "LONG";

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ${liveIndicator ? "animate-ping" : "animate-pulse"}`} />
          </div>
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Trading Signaler
          </h2>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {signals.length} aktive
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-slate-500">
              · Oppdatert {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchSignals(true)}
          disabled={refreshing}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-40"
          aria-label="Oppdater signaler"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Signal list */}
      <div className="divide-y divide-slate-700/40 max-h-[520px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Ingen signaler akkurat nå</p>
            <p className="text-slate-500 text-xs mt-1 max-w-[260px] mx-auto">
              Signaler fra Binance kommer flere ganger i timen. Aktiver en strategi for å se flere signaler.
            </p>
            <p className="text-slate-600 text-[10px] mt-2">
              Live-oppdatering · også hvert 15. sek
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((signal, i) => {
              const buy = isBuy(signal.action);
              const directionLabel = buy ? "BUY" : "SELL";
              const age = signal.created_at
                ? formatDistanceToNow(new Date(signal.created_at))
                : "";

              return (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="px-5 py-3.5 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: symbol + direction badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${
                          buy
                            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-red-500/15 text-red-400 ring-1 ring-red-500/20"
                        }`}
                      >
                        {buy ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {directionLabel}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {signal.symbol}
                        </p>
                        {signal.signal_type && (
                          <p className="text-[10px] text-slate-500 truncate">
                            {signal.signal_type}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: confidence + age */}
                    <div className="text-right shrink-0">
                      {signal.confidence != null && (
                        <ConfidenceBadge value={signal.confidence} />
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">{age}</p>
                    </div>
                  </div>

                  {/* Price details row */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <PriceCell
                      label="Inngang"
                      value={signal.entry_price}
                      visible
                    />
                    <PriceCell
                      label="Stop Loss"
                      value={signal.stop_loss}
                      visible={canSeeFullDetails}
                    />
                    <PriceCell
                      label="Take Profit"
                      value={signal.target_price}
                      visible={canSeeFullDetails}
                    />
                  </div>

                  {/* Reasoning (only for paid users) */}
                  {canSeeFullDetails && signal.reasoning && (
                    <p className="mt-2 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {signal.reasoning}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Upgrade banner for free/bachelor users */}
      {!canSeeFullDetails && signals.length > 0 && (
        <div className="px-5 py-3.5 border-t border-slate-700/50 bg-linear-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-2 rounded-lg bg-blue-500/15">
              <Lock className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                Oppgrader for å se alle detaljer
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Stop Loss, Take Profit og AI-begrunnelse krever Master eller
                høyere
              </p>
            </div>
            <Link
              href="/no/priser"
              className="shrink-0 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wide transition-colors"
            >
              Oppgrader →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value);
  const color =
    pct >= 80
      ? "text-emerald-400"
      : pct >= 60
        ? "text-yellow-400"
        : "text-orange-400";

  return (
    <span className={`text-xs font-bold tabular-nums ${color}`}>{pct}%</span>
  );
}

function PriceCell({
  label,
  value,
  visible,
}: {
  label: string;
  value: number | null;
  visible: boolean;
}) {
  return (
    <div className="bg-slate-900/50 rounded-md px-2.5 py-1.5">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      {visible ? (
        <p className="text-xs font-medium text-slate-200 tabular-nums mt-0.5">
          {value != null ? `$${value.toLocaleString("en-US")}` : "—"}
        </p>
      ) : (
        <div className="flex items-center gap-1 mt-0.5">
          <ShieldAlert className="h-3 w-3 text-slate-600" />
          <span className="text-[10px] text-slate-600">Låst</span>
        </div>
      )}
    </div>
  );
}
