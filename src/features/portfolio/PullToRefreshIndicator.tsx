"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface PullToRefreshIndicatorProps {
  distance: number;
  ready: boolean;
  refreshing: boolean;
}

export function PullToRefreshIndicator({
  distance,
  ready,
  refreshing,
}: PullToRefreshIndicatorProps) {
  const t = useTranslations("dashboard.portfolioPage");
  const opacity = Math.min(distance / 60, 1);

  return (
    <div
      className="pointer-events-none flex items-center justify-center py-2 text-sm text-white/60"
      style={{ opacity, transform: `translateY(${distance * 0.3}px)` }}
      aria-live="polite"
    >
      {refreshing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("pullToRefresh.refreshing")}
        </>
      ) : ready ? (
        <>{t("pullToRefresh.release")}</>
      ) : (
        <>{t("pullToRefresh.pull")}</>
      )}
    </div>
  );
}
