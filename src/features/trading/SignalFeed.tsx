"use client";

import { ConfidenceMeter } from "@/features/trading/PremiumSignalRow";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { formatSignalDateTime } from "@/lib/format-signal-datetime";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { enGB, nb } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  Lock,
  Minus,
  Radio,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BRAND } from "@/lib/design/tokens";
import { getTradingFeedState } from "@/lib/trading/data-source-state";
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

type SignalSide = "buy" | "sell" | "hold";

function classifySignalAction(action: string | null): SignalSide {
  const u = action?.toUpperCase() ?? "";
  if (u === "BUY" || u === "LONG") return "buy";
  if (u === "SELL" || u === "SHORT") return "sell";
  return "hold";
}

function relativeAgo(locale: string, date: Date): string {
  const loc = locale === "no" ? nb : enGB;
  return formatDistanceToNow(date, { addSuffix: true, locale: loc });
}

export function SignalFeed() {
  const locale = useLocale();
  const t = useTranslations("trading.signalFeed");
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const { hasAccess, loading: subLoading } = useSubscription();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);

  const canSeeFullDetails = hasAccess("master");

  const fetchSignals = useCallback(
    async (showRefresh = false, fromRealtime = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        setFetchError(false);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("trading_signals")
          .select(
            "id, symbol, action, asset_name, confidence, entry_price, stop_loss, target_price, signal_type, status, risk_level, reasoning, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          setFetchError(true);
          console.error("Failed to fetch trading signals:", error);
          return;
        }
        const next = (data as TradingSignal[]) ?? [];
        prevCountRef.current = next.length;
        setSignals(next);
        setLastUpdated(new Date());
        if (fromRealtime && next.length > 0) {
          setLiveIndicator(true);
          const newest = next[0];
          const side = classifySignalAction(newest.action);
          const dirKey =
            side === "buy"
              ? "toastDirBuy"
              : side === "sell"
                ? "toastDirSell"
                : "toastDirHold";
          toast.success(
            t("toastNew", {
              symbol: newest.symbol,
              direction: t(dirKey),
            }),
            {
              description:
                newest.entry_price != null
                  ? t("toastEntry", {
                      price: `$${newest.entry_price.toLocaleString("en-US")}`,
                    })
                  : undefined,
            },
          );
          setTimeout(() => setLiveIndicator(false), 2000);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    fetchSignals();
    intervalRef.current = setInterval(
      () => fetchSignals(),
      REFRESH_INTERVAL_MS,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSignals]);

  // Realtime: JWT må synkes med Realtime ellers leverer ikke RLS postgres_changes (samme mønster som trading-api).
  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void supabase.realtime.setAuth(session?.access_token ?? null);
    });

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;
      channel = supabase
        .channel("signal-feed-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "trading_signals" },
          () => {
            fetchSignals(false, true);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      authSub.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
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

  const latestSignalAgeMinutes =
    signals[0]?.created_at != null
      ? (Date.now() - new Date(signals[0].created_at).getTime()) / 60000
      : null;
  const sourceState = getTradingFeedState({
    hasError: fetchError,
    usesFallback: false,
    latestSignalAgeMinutes,
  });

  return (
    <div className={`${MARKET_DESK.panel} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span
              className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ${liveIndicator ? "animate-ping" : "animate-pulse"}`}
            />
          </div>
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            {t("title")}
          </h2>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {t("activeCount", { count: signals.length })}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              sourceState === "live"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : sourceState === "stale"
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  : sourceState === "empty"
                    ? "bg-slate-600/25 text-slate-300 border border-slate-500/40"
                    : "bg-rose-500/15 text-rose-200 border border-rose-500/30"
            }`}
          >
            {sourceState === "live"
              ? t("statusLive")
              : sourceState === "stale"
                ? t("statusStale")
                : sourceState === "empty"
                  ? t("statusEmpty")
                  : t("statusError")}
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-slate-400">
              · {t("updatedPrefix")}{" "}
              {formatDistanceToNow(lastUpdated, {
                addSuffix: true,
                locale: locale === "no" ? nb : enGB,
              })}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchSignals(true)}
          disabled={refreshing}
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-40"
          aria-label={t("refreshAria")}
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
            <p className="text-slate-200 text-sm font-medium">
              {t("emptyTitle")}
            </p>
            <p className="text-slate-400 text-xs mt-1 max-w-[280px] mx-auto leading-relaxed">
              {t("emptyBody")}
            </p>
            <p className="text-slate-500 text-[10px] mt-2">
              {t("emptyFooter")}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((signal, i) => {
              const side = classifySignalAction(signal.action);
              const directionLabel =
                side === "buy"
                  ? t("directionBuy")
                  : side === "sell"
                    ? t("directionSell")
                    : t("directionHold");
              const created = signal.created_at
                ? new Date(signal.created_at)
                : null;
              const absolute =
                created && !Number.isNaN(created.getTime())
                  ? formatSignalDateTime(locale, signal.created_at)
                  : "—";
              const age =
                created && !Number.isNaN(created.getTime())
                  ? relativeAgo(locale, created)
                  : "";

              const chipClass =
                side === "buy"
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                  : side === "sell"
                    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/20"
                    : "bg-slate-600/25 text-slate-300 ring-1 ring-slate-500/30";

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
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${chipClass}`}
                        title={absolute}
                      >
                        {side === "buy" ? (
                          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                        ) : side === "sell" ? (
                          <ArrowDown
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                        {directionLabel}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {signal.symbol}
                        </p>
                        {signal.created_at ? (
                          <p className="text-[11px] text-slate-300 tabular-nums mt-0.5">
                            <time dateTime={signal.created_at}>{absolute}</time>
                            {age ? (
                              <span className="text-slate-500"> · {age}</span>
                            ) : null}
                          </p>
                        ) : null}
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
                        <>
                          <ConfidenceBadge value={signal.confidence} />
                          <ConfidenceMeter
                            value={signal.confidence}
                            className="mt-1.5 ml-auto max-w-[72px]"
                          />
                        </>
                      )}
                      {signal.created_at ? (
                        <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums sm:hidden">
                          {absolute}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Price details row */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <PriceCell
                      label={t("priceEntry")}
                      value={signal.entry_price}
                      visible
                      lockedLabel={t("locked")}
                    />
                    <PriceCell
                      label={t("priceStop")}
                      value={signal.stop_loss}
                      visible={canSeeFullDetails}
                      lockedLabel={t("locked")}
                    />
                    <PriceCell
                      label={t("priceTarget")}
                      value={signal.target_price}
                      visible={canSeeFullDetails}
                      lockedLabel={t("locked")}
                    />
                  </div>

                  {/* Reasoning (only for paid users) */}
                  {canSeeFullDetails && signal.reasoning && (
                    <p className="mt-2 text-[11px] text-slate-300 leading-relaxed line-clamp-2">
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
        <div className="px-5 py-3.5 border-t border-slate-700/50 bg-linear-to-r from-brand-500/12 to-transparent">
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-2 rounded-lg bg-brand-500/15 ring-1 ring-brand-500/25">
              <Lock className="h-4 w-4 text-brand-400" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                {t("upgradeTitle")}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                {t("upgradeBody")}
              </p>
            </div>
            <Link
              href={`/${locale}/priser`}
              className={`shrink-0 text-[10px] font-bold ${BRAND.link} transition-colors`}
            >
              {t("upgradeCta")}
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
  lockedLabel,
}: {
  label: string;
  value: number | null;
  visible: boolean;
  lockedLabel: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-md px-2.5 py-1.5">
      <p className="text-[9px] text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      {visible ? (
        <p className="text-xs font-medium text-slate-200 tabular-nums mt-0.5">
          {value != null ? `$${value.toLocaleString("en-US")}` : "—"}
        </p>
      ) : (
        <div className="flex items-center gap-1 mt-0.5">
          <ShieldAlert className="h-3 w-3 text-slate-500" aria-hidden />
          <span className="text-[10px] text-slate-400">{lockedLabel}</span>
        </div>
      )}
    </div>
  );
}
