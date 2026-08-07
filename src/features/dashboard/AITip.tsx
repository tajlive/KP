"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, AlertTriangle, Copy } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export type AITipType = "winRateLow" | "pnlFlat" | "drawdownHigh" | "doingGreat" | "tryCopy" | "default";

interface AITipProps {
  winRate: number;
  totalPnl: number;
  totalTrades: number;
  maxDrawdown?: number;
}

function getTip(
  { winRate, totalPnl, totalTrades, maxDrawdown = 0 }: AITipProps,
  t: (key: string, values?: Record<string, string | number>) => string
): {
  type: AITipType;
  message: string;
  action?: string;
  severity: "info" | "warning" | "success";
} {
  // Rule-based prioritised logic
  if (totalTrades === 0) {
    return {
      type: "default",
      message: t("default.message"),
      severity: "info",
    };
  }

  if (winRate < 0.40 && totalTrades >= 5) {
    return {
      type: "winRateLow",
      message: t("winRateLow.message", { winRate: Math.round(winRate * 100) }),
      action: t("winRateLow.action"),
      severity: "warning",
    };
  }

  if (maxDrawdown > 15) {
    return {
      type: "drawdownHigh",
      message: t("drawdownHigh.message", { maxDrawdown: maxDrawdown.toFixed(1) }),
      action: t("drawdownHigh.action"),
      severity: "warning",
    };
  }

  if (totalPnl <= 0 && totalTrades >= 3) {
    return {
      type: "pnlFlat",
      message: t("pnlFlat.message"),
      action: t("pnlFlat.action"),
      severity: "info",
    };
  }

  if (totalPnl > 0 && winRate >= 0.55) {
    return {
      type: "doingGreat",
      message: t("doingGreat.message", { winRate: Math.round(winRate * 100) }),
      severity: "success",
    };
  }

  return {
    type: "tryCopy",
    message: t("tryCopy.message"),
    action: t("tryCopy.action"),
    severity: "info",
  };
}

const SEVERITY_STYLES = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: "text-blue-400",
    text: "text-blue-200",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-400",
    text: "text-amber-200",
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-400",
    text: "text-emerald-200",
  },
};

const ICON_MAP: Record<AITipType, React.ElementType> = {
  winRateLow: AlertTriangle,
  pnlFlat: Copy,
  drawdownHigh: AlertTriangle,
  doingGreat: TrendingUp,
  tryCopy: Lightbulb,
  default: Lightbulb,
};

/** Mål for handlingslenkene (uten locale-prefix — legges til via hrefWithLocale). */
const ACTION_HREFS: Partial<Record<AITipType, string>> = {
  winRateLow: "/dashboard/historikk",
  drawdownHigh: "/dashboard/auto-trade",
  pnlFlat: "/copy-trading/discover",
  tryCopy: "/leaderboard",
};

export function AITip(props: AITipProps) {
  const t = useTranslations("dashboard.aiTip");
  const locale = useLocale();
  const tip = getTip(props, t);
  const styles = SEVERITY_STYLES[tip.severity];
  const Icon = ICON_MAP[tip.type];
  const actionHref = tip.action ? ACTION_HREFS[tip.type] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl border p-3.5 ${styles.bg}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${styles.text}`}>{tip.message}</p>
          {tip.action && actionHref ? (
            <Link
              href={hrefWithLocale(locale, actionHref)}
              className="text-xs text-slate-400 mt-1 block hover:text-slate-200 hover:underline"
            >
              {tip.action} →
            </Link>
          ) : (
            tip.action && (
              <span className="text-xs text-slate-400 mt-1 block">
                {tip.action} →
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
