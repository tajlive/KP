"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface LiveTrade {
  id: string;
  userName: string;
  userInitials: string;
  symbol: string;
  side: "buy" | "sell";
  pnl: number;
  strategy: string;
  time: Date;
  countryCode?: string;
}

interface LiveTradeFeedProps {
  limit?: number;
  showHeader?: boolean;
}

const COUNTRY_FLAGS: { [key: string]: string } = {
  NO: "🇳🇴",
  SE: "🇸🇪",
  DK: "🇩🇰",
  FI: "🇫🇮",
  DE: "🇩🇪",
  US: "🇺🇸",
  UK: "🇬🇧",
};

export function LiveTradeFeed({ limit = 10, showHeader = true }: LiveTradeFeedProps) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [activeTraders, setActiveTraders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const t = useTranslations("trading");
  const router = useRouter();
  const dateLocale = locale === "no" ? nb : enUS;
  const supabaseRef = useRef(createClient());

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const supabase = supabaseRef.current;

      const { data: tradesData, error: tradesError } = await supabase
        .from("trades")
        .select("id, user_id, trading_pair, side, realized_pnl, created_at, mode")
        .eq("mode", "live")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tradesError) {
        console.error("LiveTradeFeed trades error:", tradesError);
        setTrades([]);
        setLoading(false);
        return;
      }

      if (!tradesData || tradesData.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(tradesData.map((t) => t.user_id).filter(Boolean))];

      const { data: profilesData } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [
          p.user_id,
          p.display_name || p.full_name || "Trader",
        ])
      );

      const mappedTrades: LiveTrade[] = tradesData.map((t) => {
        const name = profileMap.get(t.user_id) || "Trader";
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return {
          id: t.id,
          userName: name,
          userInitials: initials,
          symbol: t.trading_pair,
          side: t.side as "buy" | "sell",
          pnl: Number(t.realized_pnl) || 0,
          strategy: "Live",
          time: new Date(t.created_at),
          countryCode: "NO",
        };
      });

      setTrades(mappedTrades);

      const { count: activeCount } = await supabase
        .from("trading_sessions")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("mode", "live");

      setActiveTraders(activeCount ?? null);
    } catch (error) {
      console.error("LiveTradeFeed error:", error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("live-trades-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: "mode=eq.live",
        },
        (payload) => {
          const newTrade = payload.new as {
            id: string;
            user_id: string;
            trading_pair: string;
            side: string;
            realized_pnl: number | null;
            created_at: string;
          };

          supabase
            .from("user_profiles")
            .select("display_name, full_name")
            .eq("user_id", newTrade.user_id)
            .single()
            .then(({ data: profile }) => {
              const name = profile?.display_name || profile?.full_name || "Trader";
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const mapped: LiveTrade = {
                id: newTrade.id,
                userName: name,
                userInitials: initials,
                symbol: newTrade.trading_pair,
                side: newTrade.side as "buy" | "sell",
                pnl: Number(newTrade.realized_pnl) || 0,
                strategy: "Live",
                time: new Date(newTrade.created_at),
                countryCode: "NO",
              };

              setTrades((prev) => [mapped, ...prev].slice(0, limit));
            });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [limit]);

  const timeAgo = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: dateLocale,
    });
  };

  if (loading) {
    return (
      <motion.div
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {showHeader && (
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
            <div className="h-6 w-24 bg-slate-700 rounded animate-pulse" />
          </div>
        )}
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-3 w-16 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showHeader && (
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">🔥</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t("liveTrades")}</h3>
              <p className="text-slate-500 text-xs">{t("recentActivity")}</p>
            </div>
          </div>

          {activeTraders !== null && activeTraders > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">
                {t("activeTraders", { count: activeTraders })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {trades.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p>{t("noTradesYet")}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {trades.map((trade, index) => (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar med gradient */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${
                      trade.pnl > 0
                        ? "from-emerald-500 to-teal-600"
                        : "from-red-500 to-orange-600"
                    }`}
                  >
                    {trade.userInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">
                        {trade.userName}
                      </span>
                      <span className="text-base" title={trade.countryCode}>
                        {COUNTRY_FLAGS[trade.countryCode || "NO"]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`font-medium ${
                          trade.side === "buy" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {trade.side === "buy" ? t("buyAction") : t("sellAction")}
                      </span>
                      <span className="text-slate-400">{trade.symbol}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">{trade.strategy}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                        trade.pnl > 0
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}
                      {trade.pnl}%
                    </div>
                    <p className="text-slate-600 text-[10px] mt-1">{timeAgo(trade.time)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer med CTA */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700">
        <button
          onClick={() => router.push(`/${locale}/dashboard/resultater`)}
          className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
        >
          {t("seeAllTrades")}
        </button>
      </div>
    </motion.div>
  );
}

export default LiveTradeFeed;
