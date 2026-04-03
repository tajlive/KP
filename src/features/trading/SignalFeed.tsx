"use client";

import { ConfidenceMeter } from "@/features/trading/PremiumSignalRow";
import { getSupabaseClient } from "@/lib/supabase/client";
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
import { getTradingFeedState } from "@/lib/trading/data-source-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const REFRESH_INTERVAL_MS = 15_000;

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
    intervalRef.current = setInterval(() => fetchSignals(), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSignals]);

  // Realtime: JWT must be synced with Realtime for RLS postgres_changes to work
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
      <div className="bg-kp-bg-tertiary/50 rounded-xl p-6 space-y-4 animate-pulse border border-kp-border">
        <div className="h-5 w-40 bg-kp-bg-tertiary rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-kp-bg-tertiary/50 rounded-lg" />
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
    <div className="bg-kp-bg-tertiary/50 border border-kp-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-kp-border">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="h-4 w-4 text-kp-success" />
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-kp-success",
                liveIndicator ? "animate-ping" : "animate-pulse",
              )}
            />
          </div>
          <h2 className="text-sm font-semibold text-kp-text-primary tracking-wide uppercase">
            {t("title")}
          </h2>
          <span className="text-[10px] text-kp-text-muted tabular-nums">
            {t("activeCount", { count: signals.length })}
          </span>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
              sourceState === "live"
                ? "bg-kp-success-bg text-kp-success border-kp-success/30"
                : sourceState === "stale"
                  ? "bg-kp-warning-bg text-kp-warning border-kp-warning/30"
                  : sourceState === "empty"
                    ? "bg-kp-bg-tertiary text-kp-text-muted border-kp-border"
                    : "bg-kp-danger-bg text-kp-danger border-kp-danger/30",
            )}
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
            <span className="text-[10px] text-kp-text-muted">
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
          className="p-1.5 rounded-md text-kp-text-muted hover:text-kp-text-primary hover:bg-kp-bg-hover transition-colors disabled:opacity-40"
          aria-label={t("refreshAria")}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {/* Signal list */}
      <div className="divide-y divide-kp-border max-h-[520px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="h-8 w-8 text-kp-text-muted mx-auto mb-3" />
            <p className="text-kp-text-primary text-sm font-medium">
              {t("emptyTitle")}
            </p>
            <p className="text-kp-text-muted text-xs mt-1 max-w-[280px] mx-auto leading-relaxed">
              {t("emptyBody")}
            </p>
            <p className="text-kp-text-muted text-[10px] mt-2">
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
                  ? "bg-kp-success-bg text-kp-success ring-1 ring-kp-success/30"
                  : side === "sell"
                    ? "bg-kp-danger-bg text-kp-danger ring-1 ring-kp-danger/30"
                    : "bg-kp-bg-tertiary text-kp-text-muted ring-1 ring-kp-border";

              return (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="px-5 py-3.5 hover:bg-kp-bg-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: symbol + direction badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md",
                          chipClass,
                        )}
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
                        <p className="font-semibold text-kp-text-primary text-sm truncate">
                          {signal.symbol}
                        </p>
                        {signal.created_at ? (
                          <p className="text-[11px] text-kp-text-secondary tabular-nums mt-0.5">
                            <time dateTime={signal.created_at}>{absolute}</time>
                            {age ? (
                              <span className="text-kp-text-muted"> · {age}</span>
                            ) : null}
                          </p>
                        ) : null}
                        {signal.signal_type && (
                          <p className="text-[10px] text-kp-text-muted truncate">
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
                        <p className="text-[10px] text-kp-text-muted mt-0.5 tabular-nums sm:hidden">
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
                    <p className="mt-2 text-[11px] text-kp-text-secondary leading-relaxed line-clamp-2">
                      {signal.reasoning}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const t = useTranslations("trading.signalFeed");
  let colorClass = "text-kp-text-muted";
  if (value >= 80) colorClass = "text-kp-success";
  else if (value >= 60) colorClass = "text-kp-warning";
  else if (value >= 40) colorClass = "text-kp-warning";
  else colorClass = "text-kp-danger";

  return (
    <div
      className={cn(
        "text-xs font-bold tabular-nums tracking-tight",
        colorClass,
      )}
    >
      {value.toFixed(0)}%
    </div>
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
    <div className="bg-kp-bg-secondary rounded-md px-2.5 py-1.5 border border-kp-border">
      <p className="text-[9px] uppercase text-kp-text-muted font-bold tracking-wider">
        {label}
      </p>
      {visible ? (
        <p className="text-xs font-mono font-semibold text-kp-text-primary truncate">
          {value != null ? `$${value.toLocaleString("en-US")}` : "—"}
        </p>
      ) : (
        <div className="flex items-center gap-1 text-kp-text-muted">
          <Lock className="w-3 h-3" />
          <span className="text-[10px] font-medium">{lockedLabel}</span>
        </div>
      )}
    </div>
  );
}

export default SignalFeed;
