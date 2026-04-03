"use client";

import { useTranslations } from "next-intl";
import { Shield, Scale, Zap, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskLevel = "safe" | "balanced" | "aggressive";

interface RiskExplanationProps {
  level: RiskLevel;
  userBalance?: number;
  className?: string;
}

const LEVEL_CONFIG: Record<
  RiskLevel,
  {
    icon: typeof Shield;
    color: string;
    bgColor: string;
    textColor: string;
  }
> = {
  safe: {
    icon: Shield,
    color: "#10b981",
    bgColor: "bg-kp-success-bg",
    textColor: "text-kp-success",
  },
  balanced: {
    icon: Scale,
    color: "#f59e0b",
    bgColor: "bg-kp-warning-bg",
    textColor: "text-kp-warning",
  },
  aggressive: {
    icon: Zap,
    color: "#ef4444",
    bgColor: "bg-kp-danger-bg",
    textColor: "text-kp-danger",
  },
};

export function RiskExplanation({
  level,
  userBalance = 100000,
  className = "",
}: RiskExplanationProps) {
  const t = useTranslations("trading.riskExplanation");
  const tLevel = useTranslations(`trading.riskExplanation.levels.${level}`);
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  // Calculate actual amounts based on user balance
  const maxPositionPct = level === "safe" ? 2 : level === "balanced" ? 5 : 10;
  const maxPositionAmount = Math.floor((userBalance * maxPositionPct) / 100);
  const stopLossPct = level === "safe" ? 3 : level === "balanced" ? 7 : 15;
  const stopLossAmount = Math.floor((maxPositionAmount * stopLossPct) / 100);
  const maxExposurePct = level === "safe" ? 5 : level === "balanced" ? 15 : 30;
  const maxExposureAmount = Math.floor((userBalance * maxExposurePct) / 100);
  const dailyLossPct = level === "safe" ? 1 : level === "balanced" ? 3 : 5;
  const dailyLossAmount = Math.floor((userBalance * dailyLossPct) / 100);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("nb-NO");
  };

  // Replace placeholders in system blocks
  const formatSystemBlock = (text: string) => {
    return text
      .replace(/{maxAmount}/g, formatCurrency(maxPositionAmount))
      .replace(/{dailyLoss}/g, formatCurrency(dailyLossAmount))
      .replace(/{maxExposure}/g, formatCurrency(maxExposureAmount));
  };

  return (
    <div
      className={cn(
        "bg-kp-bg-tertiary/50 border border-kp-border rounded-xl p-5 space-y-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-kp-border">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            config.bgColor
          )}
        >
          <Icon className={cn("w-5 h-5", config.textColor)} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-kp-text-primary">
            {tLevel("headline")}
          </h3>
          <p className="text-sm text-kp-text-muted">{t("howItWorks")}</p>
        </div>
      </div>

      {/* What this means */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-kp-text-secondary">
          {t("whatThisMeans")}
        </h4>

        <div className="bg-kp-bg-secondary rounded-lg p-4 space-y-3 border border-kp-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kp-brand/20 flex items-center justify-center shrink-0">
              <span className="text-kp-brand text-sm font-bold">kr</span>
            </div>
            <p className="text-sm text-kp-text-secondary leading-relaxed">
              {tLevel("practicalExample", {
                balance: formatCurrency(userBalance),
                maxAmount: formatCurrency(maxPositionAmount),
                maxPct: maxPositionPct,
              })}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kp-danger/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-kp-danger" />
            </div>
            <p className="text-sm text-kp-text-secondary leading-relaxed">
              {tLevel("autoSellExplanation", {
                stopLossAmount: formatCurrency(stopLossAmount),
                stopLossPct: stopLossPct,
              })}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kp-brand/20 flex items-center justify-center shrink-0">
              <span className="text-kp-brand text-xs font-bold">MAX</span>
            </div>
            <p className="text-sm text-kp-text-secondary leading-relaxed">
              {tLevel("maxOpenPositions", {
                maxExposure: formatCurrency(maxExposureAmount),
                maxExposurePct: maxExposurePct,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* More likely */}
      <div className="bg-kp-success-bg border border-kp-success/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-kp-success mb-3 uppercase tracking-wide flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("moreLikely")}
        </h4>
        <ul className="space-y-2">
          {tLevel.raw("moreLikely").map((item: string, i: number) => (
            <li key={i} className="text-sm text-kp-success flex items-start gap-2">
              <span className="text-kp-success/70 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Less likely */}
      <div className="bg-kp-bg-tertiary rounded-lg p-4 border border-kp-border">
        <h4 className="text-xs font-semibold text-kp-text-muted mb-3 uppercase tracking-wide flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5" />
          {t("lessLikely")}
        </h4>
        <ul className="space-y-2">
          {tLevel.raw("lessLikely").map((item: string, i: number) => (
            <li
              key={i}
              className="text-sm text-kp-text-secondary flex items-start gap-2"
            >
              <span className="text-kp-text-muted mt-0.5">×</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* System blocks */}
      <div className="bg-kp-danger-bg border border-kp-danger/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-kp-danger mb-3 uppercase tracking-wide flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {t("systemBlocks")}
        </h4>
        <ul className="space-y-2">
          {tLevel.raw("systemBlocks").map((item: string, i: number) => (
            <li key={i} className="text-sm text-kp-danger flex items-start gap-2">
              <span className="text-kp-danger/70 mt-0.5">🚫</span>
              {formatSystemBlock(item)}
            </li>
          ))}
        </ul>
      </div>

      {/* Paper trading reminder */}
      <div className="bg-kp-brand-subtle border border-kp-brand/30 rounded-lg p-4 flex items-start gap-3">
        <span className="text-2xl">🎮</span>
        <div>
          <p className="text-sm font-medium text-kp-brand">
            {tLevel("copyForSavers.headline")}
          </p>
          <p className="text-xs text-kp-brand-light mt-1 leading-relaxed">
            {tLevel("copyForSavers.body")}
          </p>
          <p className="text-xs text-kp-brand mt-2">{t("noRealRisk")}</p>
        </div>
      </div>
    </div>
  );
}

export default RiskExplanation;
