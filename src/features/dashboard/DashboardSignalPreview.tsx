"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Radio, Zap } from "lucide-react";
import { PremiumSignalRow } from "@/features/trading/PremiumSignalRow";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { formatRelativeTimeShort } from "@/lib/format/relative-time-short";
import { getFallbackTradingSignals } from "@/lib/trading/fallback-signals";
import { getTradingFeedState } from "@/lib/trading/data-source-state";
import { hrefWithLocale } from "@/i18n/href-with-locale";

interface TradingSignal {
  id: string;
  symbol: string;
  action: string | null;
  confidence: number | null;
  entry_price: number | null;
  created_at: string | null;
}

function isFallbackId(id: string) {
  return id.startsWith("fallback-");
}

function tierLabelKey(
  tier: string,
): "student" | "bachelor" | "master" | "phd" | "professor" {
  const t = tier.toLowerCase();
  if (t === "bachelor" || t === "master" || t === "phd" || t === "professor")
    return t;
  return "student";
}

export function DashboardSignalPreview({
  tier = "student",
}: {
  tier?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const prevTopIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const mapFallback = (): TradingSignal[] =>
      getFallbackTradingSignals(3).map((s) => ({
        id: s.id,
        symbol: s.symbol,
        action: s.action,
        confidence: s.confidence,
        entry_price: s.entry_price,
        created_at: s.created_at,
      }));

    const fetchSignals = async () => {
      let nextSignals: TradingSignal[] = [];
      try {
        setFetchError(false);
        const { data, error } = await supabase
          .from("trading_signals")
          .select("id, symbol, action, confidence, entry_price, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error || !data || data.length === 0) {
          if (error) setFetchError(true);
          nextSignals = mapFallback();
        } else {
          nextSignals = (data as TradingSignal[]) ?? [];
        }
      } catch {
        setFetchError(true);
        nextSignals = mapFallback();
      } finally {
        if (mounted) {
          setSignals(nextSignals);
          setLoading(false);
        }
      }
    };

    void fetchSignals();

    const channel = supabase
      .channel("dashboard-signal-preview")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trading_signals" },
        () => {
          if (mounted) void fetchSignals();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (signals.length === 0) return;
    const top = signals[0]?.id;
    if (!top) return;
    const prev = prevTopIdRef.current;
    if (
      prev != null &&
      top !== prev &&
      !isFallbackId(top) &&
      !signals.every((s) => isFallbackId(s.id))
    ) {
      setFlashId(top);
      const timer = setTimeout(() => setFlashId(null), 2200);
      prevTopIdRef.current = top;
      return () => clearTimeout(timer);
    }
    prevTopIdRef.current = top;
  }, [signals]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse border-b border-slate-700/40 pb-5 mb-2">
        <div className="h-4 w-48 bg-slate-700/50 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-slate-800/40 rounded-xl border border-slate-700/30"
            />
          ))}
        </div>
      </div>
    );
  }

  const usingFallback =
    signals.length > 0 && signals.every((s) => isFallbackId(s.id));
  const latestAgeMinutes =
    signals[0]?.created_at != null
      ? (Date.now() - new Date(signals[0].created_at).getTime()) / 60000
      : null;
  const sourceState = getTradingFeedState({
    hasError: fetchError,
    usesFallback: usingFallback,
    latestSignalAgeMinutes: latestAgeMinutes,
  });
  const tierKey = tierLabelKey(tier);
  const planName = t(`tierLabels.${tierKey}`);

  return (
    <div className="border-b border-slate-700/40 pb-5 mb-1">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h3
            className={`${MARKET_DESK.title} !tracking-[0.14em] text-slate-200`}
          >
            <Zap className="h-3.5 w-3.5 text-[#0052FF]" aria-hidden />
            {t("signalPreview.title")}
          </h3>
          {signals.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                sourceState === "live"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : sourceState === "stale"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : sourceState === "error"
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : "bg-slate-600/25 text-slate-400 border border-dashed border-slate-500/40"
              }`}
            >
              {sourceState === "live"
                ? t("signalPreview.liveBadge")
                : sourceState === "stale"
                  ? t("signalPreview.staleBadge")
                  : sourceState === "error"
                    ? t("signalPreview.errorBadge")
                    : sourceState === "empty"
                      ? t("signalPreview.emptyBadge")
                      : t("signalPreview.demoBadge")}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
            · {t("signalPreview.curated")}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-md bg-[#0052FF]/10 text-[#3d7aff] border border-[#0052FF]/20 font-semibold"
            title={t("signalPreview.planChip", { tier: planName })}
          >
            {t("signalPreview.planChip", { tier: planName })}
          </span>
        </div>
        <Link
          href={hrefWithLocale(locale, "/paper-trading")}
          className="text-sm font-medium text-[#3d7aff] hover:text-[#5c8fff] transition-colors"
        >
          {t("signalPreview.seeAll")}
        </Link>
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">
          {t("signalPreview.empty")}
        </p>
      ) : (
        <div className="space-y-2" data-testid="dashboard-signal-preview-rows">
          {signals.map((s, i) => (
            <PremiumSignalRow
              key={s.id}
              symbol={s.symbol}
              action={s.action}
              confidence={s.confidence}
              entry_price={s.entry_price}
              created_at={s.created_at}
              staggerIndex={i}
              highlight={flashId === s.id}
              isDemo={isFallbackId(s.id)}
              showEntryPrice
              ageLabel={
                s.created_at
                  ? formatRelativeTimeShort(new Date(s.created_at), locale)
                  : "—"
              }
              labels={{
                buy: t("signalPreview.directionBuy"),
                sell: t("signalPreview.directionSell"),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
