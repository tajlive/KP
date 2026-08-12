"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { m } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info, Wallet } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import type { DashboardMode } from "@/hooks/useDashboardMetrics";
import { BetaBadgeClient } from "@/components/BetaBadgeClient";

interface DashboardTopBarProps {
  balance?: number | null;
  investedCapital?: number;
  positionCount?: number;
  changePct?: number | null;
  mode: DashboardMode;
  ctaLink?: string;
}

export function DashboardTopBar({
  balance,
  investedCapital = 0,
  positionCount = 0,
  changePct,
  mode,
  ctaLink,
}: DashboardTopBarProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.topBar");
  const { formatByMode } = useCurrency();
  const isPaper = mode === "paper";
  const href = ctaLink ?? `/${locale}/handel?mode=${mode}`;

  // Guard against NaN / Infinity / -Infinity
  const safeChangePct =
    typeof changePct === "number" && Number.isFinite(changePct) ? changePct : null;

  const changeTrend =
    safeChangePct == null ? "neutral" : safeChangePct >= 0 ? "up" : "down";

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
          <div className="flex items-center gap-2">
            <BetaBadgeClient />
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
          </div>

          {/* Balance + endring */}
          <div className="flex flex-col items-end min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-base sm:text-lg font-bold text-kp-text-primary tabular-nums truncate">
                {balance == null ? (
                  <span>{t("noData")}</span>
                ) : (
                  formatByMode((balance ?? 0) + investedCapital, mode)
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
                {safeChangePct == null ? (
                  <span>{t("noData")}</span>
                ) : (
                  <>
                    {safeChangePct > 0 ? "+" : ""}
                    {safeChangePct.toFixed(2)}%
                  </>
                )}
              </div>
            </div>
            {/* Forklaring: vis ledig + investert */}
            {isPaper && (balance != null || investedCapital > 0) && (
              <div className="text-[11px] text-kp-text-secondary mt-0.5 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-kp-text-muted" />
                <span>{formatByMode(balance ?? 0, mode)} ledig</span>
                <span className="text-kp-border">·</span>
                <TrendingUp className="w-3.5 h-3.5 text-kp-text-muted" />
                <span>{formatByMode(investedCapital, mode)} investert</span>
                {positionCount > 0 && (
                  <span className="text-kp-text-muted">
                    · {positionCount} posisjon{positionCount !== 1 ? "er" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CTA — skjult på smale skjermer (duplikat av hero-CTA under) */}
          <Link href={href} className="shrink-0 hidden min-[420px]:block">
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
