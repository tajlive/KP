"use client";

import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import { LeaderCard } from "./LeaderCard";
import { useLocale, useTranslations } from "next-intl";
import { m, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TimeframeKey = "7d" | "30d" | "90d";
type FilterKey = "all" | "following";

type DiscoverApiMeta = {
  activeBotsConsidered: number;
  publicProfilesConsidered: number;
  profileOnlyAdded: number;
  followsLookupFailed?: boolean;
  profilesLookupFailed?: boolean;
};

type DiscoverApiBody = {
  leaders: DiscoverLeaderDto[];
  meta?: DiscoverApiMeta;
  reason?: "ok" | "no_public_traders" | "partial_data" | "backend_error";
  source?: "none" | "bots" | "trader_profiles" | "mixed";
};

const INITIAL_LIMIT = 50;
const MAX_LIMIT = 100;
const SKELETON_COUNT = 9;

export function CopyTradingDiscoverClient() {
  const locale = useLocale();
  const t = useTranslations("copyTrading.discover");
  const reduceMotion = useReducedMotion();
  const [timeframe, setTimeframe] = useState<TimeframeKey>("30d");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pageLimit, setPageLimit] = useState(INITIAL_LIMIT);
  const [leaders, setLeaders] = useState<DiscoverLeaderDto[]>([]);
  const [meta, setMeta] = useState<DiscoverApiMeta | null>(null);
  const [source, setSource] = useState<DiscoverApiBody["source"] | null>(null);
  const [reason, setReason] = useState<DiscoverApiBody["reason"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leadersRef = useRef<DiscoverLeaderDto[]>([]);
  leadersRef.current = leaders;

  const load = useCallback(
    async (tf: TimeframeKey, lim: number) => {
      setError(null);
      const hadRows = leadersRef.current.length > 0;
      if (hadRows) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch(
          `/api/copy-trading/discover?timeframe=${tf}&limit=${lim}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            reason?: string;
          };
          if (res.status === 401) {
            throw new Error("auth_required");
          }
          throw new Error(
            typeof body.error === "string" ? body.error : "fetch",
          );
        }
        const data = (await res.json()) as DiscoverApiBody;
        setLeaders(data.leaders ?? []);
        setMeta(data.meta ?? null);
        setSource(data.source ?? null);
        setReason(data.reason ?? null);
      } catch (e) {
        setReason("backend_error");
        const msg =
          e instanceof Error && e.message === "auth_required"
            ? t("authRequired")
            : t("loadError");
        setError(msg);
        if (!hadRows) setLeaders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    setPageLimit(INITIAL_LIMIT);
  }, [timeframe]);

  useEffect(() => {
    void load(timeframe, pageLimit);
  }, [load, timeframe, pageLimit]);

  const filtered = useMemo(() => {
    if (filter === "following") {
      return leaders.filter((l) => l.is_following);
    }
    return leaders;
  }, [leaders, filter]);

  const canLoadMore =
    pageLimit < MAX_LIMIT && leaders.length >= pageLimit && !loading;

  const tfBtn = (key: TimeframeKey, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setTimeframe(key)}
      className={cn(
        "rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors",
        timeframe === key
          ? "bg-white/10 text-white shadow-inner"
          : "text-slate-400 hover:text-white",
      )}
    >
      {label}
    </button>
  );

  const filterBtn = (key: FilterKey, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={cn(
        "rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors",
        filter === key
          ? "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-500/40"
          : "text-slate-400 hover:text-white",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <m.header
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex rounded-2xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-md"
            role="group"
            aria-label={t("ariaTimeframe")}
          >
            {tfBtn("7d", t("timeframe7"))}
            {tfBtn("30d", t("timeframe30"))}
            {tfBtn("90d", t("timeframe90"))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-2xl border border-white/10 bg-slate-900/50 p-1"
              role="group"
              aria-label={t("ariaFilter")}
            >
              {filterBtn("all", t("filterAll"))}
              {filterBtn("following", t("filterFollowing"))}
            </div>
            <button
              type="button"
              onClick={() => void load(timeframe, pageLimit)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              {(loading || refreshing) && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              )}
              {t("refresh")}
            </button>
          </div>
        </div>

        {!loading && leaders.length > 0 && (
          <p className="text-[13px] leading-relaxed text-slate-500">
            {filter === "following" && filtered.length === 0
              ? t("filterFollowingEmpty")
              : t("resultsLine", {
                  visible: filtered.length,
                  total: leaders.length,
                })}
            {meta != null && source !== "none" ? (
              <span className="mt-1 block text-[12px] text-slate-600">
                {t("resultsMeta", {
                  bots: meta.activeBotsConsidered,
                  profiles: meta.publicProfilesConsidered,
                })}
              </span>
            ) : null}
          </p>
        )}
      </m.header>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="relative">
        {refreshing && leaders.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-3xl p-4"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[12px] text-slate-300 shadow-lg backdrop-blur-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              {t("refreshing")}
            </span>
          </div>
        )}

        {loading && leaders.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-3xl bg-slate-900/80"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-12 text-center text-slate-400">
            {leaders.length === 0
              ? reason === "no_public_traders"
                ? t("emptyNoPublic")
                : reason === "backend_error"
                  ? t("emptyBackend")
                  : t("empty")
              : t("filterFollowingEmpty")}
          </p>
        ) : (
          <>
            <div
              className={cn(
                "flex w-full snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-6 sm:grid sm:overflow-visible sm:grid-cols-2 lg:grid-cols-3",
                refreshing && "opacity-60 transition-opacity",
              )}
              aria-busy={refreshing}
            >
              {filtered.map((leader, index) => (
                <LeaderCard
                  key={`${leader.id}-${leader.leaderAuthUserId}`}
                  leader={leader}
                  locale={locale}
                  timeframe={timeframe}
                  index={index}
                />
              ))}
            </div>
            {canLoadMore && filter === "all" && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPageLimit(MAX_LIMIT)}
                  className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-6 py-3 text-sm font-semibold text-indigo-100 transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/20"
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
