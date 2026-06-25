"use client";

import type { DiscoverLeaderDto } from "@/lib/copy-trading/discover-types";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { m, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { LeaderComparisonStrip } from "./LeaderComparisonStrip";
import { TrendDelta } from "./TrendDelta";
import { QuickFollowSheet } from "./QuickFollowSheet";
import { useTranslations } from "next-intl";
import { useState } from "react";

type TimeframeKey = "7d" | "30d" | "90d";

type LeaderCardProps = {
  leader: DiscoverLeaderDto;
  locale: string;
  timeframe: TimeframeKey;
  index: number;
};

function pnlForTimeframe(leader: DiscoverLeaderDto, tf: TimeframeKey): number {
  if (tf === "90d") return Number(leader.pnl_90d ?? 0);
  return Number(leader.pnl_30d ?? 0);
}

function riskLabelKey(tier: DiscoverLeaderDto["risk_tier"]): string {
  if (tier === "low") return "riskLow";
  if (tier === "high") return "riskHigh";
  return "riskMedium";
}

const STAGGER_CAP = 12;
const STAGGER_STEP = 0.045;

export function LeaderCard({
  leader,
  locale,
  timeframe,
  index,
}: LeaderCardProps) {
  const t = useTranslations("copyTrading.discover");
  const reduceMotion = useReducedMotion();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const staggerDelay = reduceMotion
    ? 0
    : Math.min(index, STAGGER_CAP - 1) * STAGGER_STEP;
  const isCommunity =
    leader.origin === "community" || leader.strategy_type === "Community";
  const pnl = pnlForTimeframe(leader, timeframe);
  const tfLabel =
    timeframe === "90d"
      ? t("timeframe90")
      : timeframe === "7d"
        ? t("timeframe7")
        : t("timeframe30");

  const riskKey = riskLabelKey(leader.risk_tier);

  return (
    <m.article
      data-testid="copy-trading-leader-card"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: reduceMotion ? 0 : index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        reduceMotion ? undefined : { y: -3, transition: { duration: 0.2 } }
      }
      className="group relative flex w-[88vw] shrink-0 snap-center flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-indigo-500/30 hover:shadow-[0_12px_48px_rgba(99,102,241,0.12)] sm:w-auto"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -20%, rgba(99,102,241,0.25), transparent 55%)",
        }}
      />

      <div className="relative flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600 to-blue-700">
          {/* unoptimized: avatar host varies and may not be in next.config remotePatterns */}
          {leader.avatar_url ? (
            <Image
              src={leader.avatar_url}
              alt=""
              fill
              sizes="64px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {leader.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {leader.display_name}
            </h3>
            <Badge
              variant="secondary"
              className={
                isCommunity
                  ? "border border-sky-500/35 bg-sky-500/10 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90"
                  : "border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90"
              }
            >
              {isCommunity ? t("communityBadge") : t("paperBadge")}
            </Badge>
            {leader.is_following && (
              <Badge className="bg-emerald-500/15 text-[10px] text-emerald-300">
                {t("following")}
              </Badge>
            )}
          </div>
          {leader.strategy_type && (
            <p className="mt-0.5 truncate text-[13px] text-slate-400">
              {leader.strategy_type}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TrendDelta
          valueNok={pnl}
          label={tfLabel}
          periodDescription={`${leader.display_name} ${tfLabel}`}
        />
        <div className="flex flex-col justify-end gap-2 text-[12px] text-slate-400">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="tabular-nums">
              {t("winRate")}: {(leader.win_rate ?? 0).toFixed(1)}%
            </span>
            <span className="tabular-nums">
              {t("sharpe")}: {(leader.sharpe_ratio ?? 0).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            {t(riskKey)}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <LeaderComparisonStrip
          pnl30={Number(leader.pnl_30d ?? 0)}
          pnl90={Number(leader.pnl_90d ?? 0)}
          caption={t("comparisonCaption")}
        />
      </div>

      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-slate-500">
        <span>{t("followers", { count: leader.follower_count ?? 0 })}</span>
        {leader.performance_fee_pct != null &&
          leader.performance_fee_pct > 0 && (
            <span className="tabular-nums">
              {t("fee")}: {leader.performance_fee_pct}%
            </span>
          )}
        {leader.max_drawdown_30d != null && (
          <span className="tabular-nums">
            {t("drawdown")}: {Number(leader.max_drawdown_30d).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="relative mt-2 text-[10px] leading-snug text-slate-600">
        {t("riskHint")}
      </p>

      {/* CTAs: primær 'Kopier nå' + sekundær 'Se profil' */}
      <div className="relative mt-4 flex flex-col gap-2">
        {leader.is_following ? (
          <div className="flex h-[48px] items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-[14px] font-semibold text-emerald-300">
            {t("alreadyFollowing")}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="h-[48px] w-full rounded-2xl bg-brand-500 text-[14px] font-bold text-white shadow-md shadow-brand-500/20 transition-all active:scale-[0.98] hover:bg-brand-600"
          >
            {t("copyNow")}
          </button>
        )}
        <Button
          asChild
          variant="ghost"
          className="h-[44px] w-full rounded-2xl border border-white/10 text-[13px] font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Link
            href={hrefWithLocale(
              locale,
              `/copy-trading/traders/${leader.traderHrefId}`,
            )}
          >
            {t("viewProfile")}
          </Link>
        </Button>
      </div>

      <QuickFollowSheet
        leaderId={leader.leaderAuthUserId}
        leaderName={leader.display_name}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </m.article>
  );
}
