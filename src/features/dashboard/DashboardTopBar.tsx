"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { m } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import type { DashboardMode } from "@/hooks/useDashboardMetrics";

interface DashboardTopBarProps {
  balance?: number | null;
  changePct?: number | null;
  mode: DashboardMode;
  ctaLink?: string;
}

export function DashboardTopBar({
  balance,
  changePct,
  mode,
  ctaLink,
}: DashboardTopBarProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.topBar");
  const { formatByMode } = useCurrency();
  const isPaper = mode === "paper";
  const href = ctaLink ?? `/${locale}/handel?mode=${mode}`;

  const changeTrend =
    changePct == null ? "neutral" : changePct >= 0 ? "up" : "down";

  const TrendIcon =
    changeTrend === "up"
      ? TrendingUp
      : changeTrend === "down"
        ? TrendingDown
        : Minus;

  return (
    <m.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30 w-full border-b border-kp-border bg-kp-bg-primary/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Mode badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase whitespace-nowrap ${
              isPaper
                ? "bg-blue-500/12 text-blue-500 dark:text-blue-400 border border-blue-500/20"
                : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                  isPaper ? "bg-blue-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isPaper ? "bg-blue-500" : "bg-emerald-500"
                }`}
              />
            </span>
            {isPaper ? t("paperMode") : t("liveMode")}
          </span>

          {/* Balance + change */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-lg sm:text-xl font-bold text-kp-text-primary tabular-nums truncate">
              {balance == null ? (
                <span>{t("noData")}</span>
              ) : (
                formatByMode(balance, mode)
              )}
            </div>

            <div
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                changeTrend === "up"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : changeTrend === "down"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <TrendIcon className="w-3 h-3" />
              {changePct == null ? (
                <span>{t("noData")}</span>
              ) : (
                <>
                  {changePct > 0 ? "+" : ""}
                  {changePct.toFixed(2)}%
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <Link href={href} className="shrink-0">
            <Button
              size="sm"
              className="bg-kp-brand hover:bg-kp-brand-hover text-white text-xs sm:text-sm font-semibold rounded-lg px-3 sm:px-4 h-9"
            >
              {isPaper ? t("ctaPaper") : t("ctaLive")}
            </Button>
          </Link>
        </div>
      </div>
    </m.header>
  );
}
