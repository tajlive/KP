"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";

interface LandingSignal {
  id: string;
  symbol: string;
  action: string | null;
  confidence: number | null;
  entry_price: number | null;
  created_at: string | null;
}

const FALLBACK_SIGNALS: LandingSignal[] = [
  {
    id: "fallback-1",
    symbol: "BTC/USDT",
    action: "BUY",
    confidence: 87,
    entry_price: 42450,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "fallback-2",
    symbol: "ETH/USDT",
    action: "SELL",
    confidence: 74,
    entry_price: 2280,
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
  {
    id: "fallback-3",
    symbol: "SOL/USDT",
    action: "BUY",
    confidence: 91,
    entry_price: 98.2,
    created_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
  },
  {
    id: "fallback-4",
    symbol: "BNB/USDT",
    action: "BUY",
    confidence: 68,
    entry_price: 312,
    created_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
  },
];

export function LiveSignalFeed() {
  const locale = useLocale();
  const [signals, setSignals] = useState<LandingSignal[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchSignals = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("trading_signals")
        .select("id, symbol, action, confidence, entry_price, created_at")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error || !data || data.length === 0) {
        setSignals(FALLBACK_SIGNALS);
      } else {
        setSignals(data as LandingSignal[]);
      }
    } catch {
      setSignals(FALLBACK_SIGNALS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const displaySignals = loaded ? signals : FALLBACK_SIGNALS;

  const isBuy = (action: string | null) =>
    action?.toUpperCase() === "BUY" || action?.toUpperCase() === "LONG";

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Zap className="h-3 w-3 text-[#0052FF]" /> Siste Real-Time Signaler
        </span>
      </div>

      <div className="space-y-2">
        {displaySignals.map((sig, i) => {
          const buy = isBuy(sig.action);
          const age = sig.created_at
            ? formatDistanceToNow(new Date(sig.created_at))
            : "";
          const price =
            sig.entry_price != null
              ? `$${sig.entry_price.toLocaleString("en-US")}`
              : "—";
          const confidencePct =
            sig.confidence != null ? `${Math.round(sig.confidence)}%` : "";

          return (
            <motion.div
              key={sig.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/80 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="font-bold text-sm text-white tabular-nums">
                  {sig.symbol}
                </div>
                <div
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                    buy
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                  }`}
                >
                  {buy ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  )}
                  {buy ? "BUY" : "SELL"}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-400 tabular-nums">
                  {price}
                </div>
                {confidencePct && (
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-400 tabular-nums">
                    {confidencePct}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 w-20 text-right">
                  {age}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-center">
        <Link
          href={`/${locale}/paper-trading`}
          className="text-[10px] font-bold text-[#0052FF] hover:text-[#3d7aff] uppercase tracking-tight transition-colors"
        >
          Se alle historiske signaler →
        </Link>
      </div>
    </div>
  );
}
