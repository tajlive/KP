"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, AlertTriangle, Copy } from "lucide-react";
import { useLocale } from "next-intl";

export type AITipType = "winRateLow" | "pnlFlat" | "drawdownHigh" | "doingGreat" | "tryCopy" | "default";

interface AITipProps {
  winRate: number;
  totalPnl: number;
  totalTrades: number;
  maxDrawdown?: number;
}

function getTip({ winRate, totalPnl, totalTrades, maxDrawdown = 0 }: AITipProps): {
  type: AITipType;
  message: string;
  action?: string;
  severity: "info" | "warning" | "success";
} {
  const isNo = typeof window !== "undefined" && window.location.pathname.startsWith("/no");

  // Rule-based prioritised logic
  if (totalTrades === 0) {
    return {
      type: "default",
      message: isNo
        ? "Start din første paper-trade for å se AI-innsikt her."
        : "Start your first paper trade to see AI insights here.",
      severity: "info",
    };
  }

  if (winRate < 40 && totalTrades >= 5) {
    return {
      type: "winRateLow",
      message: isNo
        ? `Win rate på ${winRate}% er under bransjesnittet (55%). Gjennomgå tapende trades for å finne mønstre.`
        : `Win rate of ${winRate}% is below industry average (55%). Review losing trades to find patterns.`,
      action: isNo ? "Gå til trade-historikk" : "Go to trade history",
      severity: "warning",
    };
  }

  if (maxDrawdown > 15) {
    return {
      type: "drawdownHigh",
      message: isNo
        ? `Maks drawdown på ${maxDrawdown.toFixed(1)}% er høy. Vurder å redusere posisjonsstørrelse.`
        : `Max drawdown of ${maxDrawdown.toFixed(1)}% is high. Consider reducing position size.`,
      action: isNo ? "Se risiko-innstillinger" : "View risk settings",
      severity: "warning",
    };
  }

  if (totalPnl <= 0 && totalTrades >= 3) {
    return {
      type: "pnlFlat",
      message: isNo
        ? "P&L er flat etter flere trades. Prøv copy-trading for å se hvordan erfarne tradere opererer."
        : "P&L is flat after several trades. Try copy-trading to see how experienced traders operate.",
      action: isNo ? "Utforsk copy-trading" : "Explore copy-trading",
      severity: "info",
    };
  }

  if (totalPnl > 0 && winRate >= 55) {
    return {
      type: "doingGreat",
      message: isNo
        ? `Sterkt! ${winRate}% win rate og positiv avkastning. Vurder å øke kapitalen gradvis.`
        : `Strong! ${winRate}% win rate and positive returns. Consider increasing capital gradually.`,
      severity: "success",
    };
  }

  return {
    type: "tryCopy",
    message: isNo
      ? "Nye trades registrert. Se på topp-tradere for inspirasjon."
      : "New trades registered. Check out top traders for inspiration.",
    action: isNo ? "Se leaderboards" : "View leaderboards",
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

export function AITip(props: AITipProps) {
  const tip = getTip(props);
  const styles = SEVERITY_STYLES[tip.severity];
  const Icon = ICON_MAP[tip.type];
  const locale = useLocale();
  const isNo = locale === "no";

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
          {tip.action && (
            <span className="text-xs text-slate-400 mt-1 block">
              {tip.action} →
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
