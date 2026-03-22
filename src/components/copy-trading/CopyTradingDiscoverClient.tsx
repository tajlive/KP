"use client";

import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import { LeaderCard } from "./LeaderCard";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TimeframeKey = "7d" | "30d" | "90d";

export function CopyTradingDiscoverClient() {
  const locale = useLocale();
  const t = useTranslations("copyTrading.discover");
  const reduceMotion = useReducedMotion();
  const [timeframe, setTimeframe] = useState<TimeframeKey>("30d");
  const [leaders, setLeaders] = useState<DiscoverLeaderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (tf: TimeframeKey) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/copy-trading/discover?timeframe=${tf}&limit=24`,
          { credentials: "include" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            typeof body.error === "string" ? body.error : "fetch",
          );
        }
        const data = (await res.json()) as { leaders: DiscoverLeaderDto[] };
        setLeaders(data.leaders ?? []);
      } catch {
        setError(t("loadError"));
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(timeframe);
  }, [load, timeframe]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-slate-400">
          {t("subtitle")}
        </p>
        <div
          className="inline-flex rounded-2xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-md"
          role="group"
          aria-label="Periode"
        >
          {tfBtn("7d", t("timeframe7"))}
          {tfBtn("30d", t("timeframe30"))}
          {tfBtn("90d", t("timeframe90"))}
        </div>
      </motion.header>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && leaders.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-3xl bg-slate-900/80"
            />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-12 text-center text-slate-400">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaders.map((leader, index) => (
            <LeaderCard
              key={leader.id}
              leader={leader}
              locale={locale}
              timeframe={timeframe}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
