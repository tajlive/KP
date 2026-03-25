"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { PremiumSignalRow } from "@/components/trading/PremiumSignalRow";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { formatRelativeTimeShort } from "@/lib/format/relative-time-short";
import {
  getFallbackTradingSignals,
  LANDING_SIGNAL_FALLBACK_ANCHOR_MS,
} from "@/lib/trading/fallback-signals";
import { getTradingFeedState } from "@/lib/trading/data-source-state";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

interface LandingSignal {
  id: string;
  symbol: string;
  action: string | null;
  confidence: number | null;
  entry_price: number | null;
  created_at: string | null;
}

export function LiveSignalFeed() {
  const locale = useLocale();
  const t = useTranslations("landing");
  const [signals, setSignals] = useState<LandingSignal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchSignals = useCallback(async () => {
    try {
      setFetchError(false);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("trading_signals")
        .select("id, symbol, action, confidence, entry_price, created_at")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error || !data || data.length === 0) {
        if (error) setFetchError(true);
        setSignals(getFallbackTradingSignals(4) as LandingSignal[]);
      } else {
        setSignals(data as LandingSignal[]);
      }
    } catch {
      setFetchError(true);
      setSignals(getFallbackTradingSignals(4) as LandingSignal[]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const displaySignals = loaded
    ? signals
    : (getFallbackTradingSignals(
        4,
        LANDING_SIGNAL_FALLBACK_ANCHOR_MS,
      ) as LandingSignal[]);

  const isDemo =
    displaySignals.length > 0 &&
    displaySignals.every((s) => s.id.startsWith("fallback-"));
  const latestAgeMinutes =
    displaySignals[0]?.created_at != null
      ? (Date.now() - new Date(displaySignals[0].created_at).getTime()) / 60000
      : null;
  const feedState = getTradingFeedState({
    hasError: fetchError,
    usesFallback: isDemo,
    latestSignalAgeMinutes: latestAgeMinutes,
  });
  const stateLabelMap = {
    live: t("liveSignalFeed.stateLive"),
    stale: t("liveSignalFeed.stateStale"),
    demo: t("liveSignalFeed.stateDemo"),
    empty: t("liveSignalFeed.stateEmpty"),
    error: t("liveSignalFeed.stateError"),
  } as const;

  return (
    <div className={`${MARKET_DESK.panelLanding} p-4`}>
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className={`${MARKET_DESK.title} text-slate-300`}>
          <Zap className="h-3 w-3 text-[#0052FF] shrink-0" aria-hidden />
          {t("liveSignalFeed.title")}
        </span>
        <span
          className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            feedState === "live"
              ? "text-emerald-300 border border-emerald-500/30 bg-emerald-500/10"
              : feedState === "stale"
                ? "text-amber-200 border border-amber-500/30 bg-amber-500/10"
                : feedState === "error"
                  ? "text-rose-200 border border-rose-500/30 bg-rose-500/10"
                  : "text-slate-500 border border-dashed border-slate-600/50"
          }`}
        >
          {stateLabelMap[feedState]}
        </span>
      </div>

      <div className="space-y-2">
        {displaySignals.map((sig, i) => (
          <PremiumSignalRow
            key={sig.id}
            symbol={sig.symbol}
            action={sig.action}
            confidence={sig.confidence}
            entry_price={sig.entry_price}
            created_at={sig.created_at}
            staggerIndex={i}
            isDemo={sig.id.startsWith("fallback-")}
            showEntryPrice
            ageLabel={
              sig.created_at
                ? formatRelativeTimeShort(new Date(sig.created_at), locale)
                : "—"
            }
            labels={{
              buy: t("liveSignalFeed.directionBuy"),
              sell: t("liveSignalFeed.directionSell"),
            }}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-center">
        <Link
          href={`/${locale}/paper-trading`}
          className="text-[10px] font-bold text-[#0052FF] hover:text-[#3d7aff] uppercase tracking-tight transition-colors"
        >
          {t("liveSignalFeed.seeAll")}
        </Link>
      </div>
    </div>
  );
}
