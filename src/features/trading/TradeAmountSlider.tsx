"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AlertCircle, Wallet, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface TradeAmountSliderProps {
  userBalance: number;
  maxPositionPct: number;
  maxPositionAmount: number;
  currentExposure: number;
  onAmountSelect?: (amount: number) => void;
  selectedAmount?: number;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export function TradeAmountSlider({
  userBalance,
  maxPositionPct,
  maxPositionAmount,
  currentExposure,
  onAmountSelect,
  selectedAmount,
}: TradeAmountSliderProps) {
  const t = useTranslations("trading.tradeAmountSlider");
  const { format } = useCurrency();
  const [amount, setAmount] = useState(
    selectedAmount || Math.min(2000, maxPositionAmount)
  );

  const remainingExposure =
    maxPositionAmount *
      (maxPositionPct === 2 ? 2.5 : maxPositionPct === 5 ? 3 : 3) -
    currentExposure;

  const percentageOfBalance = (amount / userBalance) * 100;
  const percentageOfMax = (amount / maxPositionAmount) * 100;

  const status = useMemo(() => {
    if (amount > maxPositionAmount) return "blocked";
    if (amount > remainingExposure) return "warning";
    if (percentageOfBalance > maxPositionPct * 1.5) return "caution";
    return "ok";
  }, [amount, maxPositionAmount, remainingExposure, percentageOfBalance, maxPositionPct]);

  const handlePresetClick = (preset: number) => {
    const newAmount = Math.min(preset, userBalance);
    setAmount(newAmount);
    onAmountSelect?.(newAmount);
  };

  const handleSliderChange = (value: number[]) => {
    const newAmount = value[0];
    setAmount(newAmount);
    onAmountSelect?.(newAmount);
  };

  const getStatusColor = () => {
    switch (status) {
      case "blocked":
        return "text-kp-danger";
      case "warning":
        return "text-kp-warning";
      case "caution":
        return "text-kp-warning";
      default:
        return "text-kp-success";
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "blocked":
        return "bg-kp-danger border-kp-danger/30";
      case "warning":
        return "bg-kp-warning-bg border-kp-warning/30";
      case "caution":
        return "bg-kp-warning-bg border-kp-warning/30";
      default:
        return "bg-kp-success border-kp-success/30";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with explanation */}
      <div className="bg-kp-bg-tertiary/50 border border-kp-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-kp-text-muted" />
            <span className="text-sm text-kp-text-muted">{t("balance")}</span>
          </div>
          <span className="text-lg font-bold text-kp-text-primary">
            {format(userBalance)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-kp-brand" />
            <span className="text-kp-text-muted">{t("maxPerTrade")}</span>
          </div>
          <span className="font-medium text-kp-brand">
            {format(maxPositionAmount)} ({maxPositionPct}%)
          </span>
        </div>

        {currentExposure > 0 && (
          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-kp-border">
            <span className="text-kp-text-muted">{t("alreadyInMarket")}</span>
            <span className="font-medium text-kp-warning">
              {format(currentExposure)}
            </span>
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="bg-kp-bg-tertiary/50 border border-kp-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-kp-text-secondary">
            {t("title")}
          </label>
          <span className={cn("text-2xl font-bold", getStatusColor())}>
            {format(amount)}
          </span>
        </div>

        <Slider
          value={[amount]}
          onValueChange={handleSliderChange}
          max={Math.min(userBalance, maxPositionAmount * 1.5)}
          step={100}
          className="w-full"
        />

        {/* Status message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-lg p-3 border", getStatusBg())}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className={cn("w-4 h-4 mt-0.5", getStatusColor())} />
            <div className="text-sm">
              {status === "blocked" && (
                <>
                  <span className={getStatusColor()}>
                    {t("status.blocked.title", {
                      amount: format(maxPositionAmount),
                    })}
                  </span>
                  <p className="text-kp-text-muted mt-1 text-xs">
                    {t("status.blocked.description")}
                  </p>
                </>
              )}
              {status === "warning" && (
                <>
                  <span className={getStatusColor()}>
                    {t("status.warning.title")}
                  </span>
                  <p className="text-kp-text-muted mt-1 text-xs">
                    {t("status.warning.description", {
                      remaining: format(remainingExposure),
                    })}
                  </p>
                </>
              )}
              {status === "caution" && (
                <>
                  <span className={getStatusColor()}>
                    {t("status.caution.title", {
                      percentage: percentageOfBalance.toFixed(1),
                    })}
                  </span>
                  <p className="text-kp-text-muted mt-1 text-xs">
                    {t("status.caution.description")}
                  </p>
                </>
              )}
              {status === "ok" && (
                <>
                  <span className={getStatusColor()}>
                    {t("status.ok.title", {
                      percentage: percentageOfBalance.toFixed(1),
                    })}
                  </span>
                  <p className="text-kp-text-muted mt-1 text-xs">
                    {t("status.ok.description")}
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Explanation of what happens */}
        <div className="bg-kp-bg-tertiary rounded-lg p-3 space-y-2 border border-kp-border">
          <h4 className="text-xs font-medium text-kp-text-muted uppercase tracking-wide">
            {t("whatThisMeans")}
          </h4>
          <ul className="space-y-1.5 text-sm text-kp-text-secondary">
            <li className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-kp-success" />
              {t("scenarios.gain", { amount: format(amount * 0.1) })}
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-kp-danger" />
              {t("scenarios.loss", { amount: format(amount * 0.1) })}
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-kp-brand" />
              {t("scenarios.stopLoss", { amount: format(amount * 0.15) })}
            </li>
          </ul>
        </div>
      </div>

      {/* Quick select buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESET_AMOUNTS.filter((preset) => preset <= maxPositionAmount * 1.2)
          .slice(0, 6)
          .map((preset) => (
            <Button
              key={preset}
              variant={amount === preset ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              disabled={preset > maxPositionAmount}
              className={cn(
                "text-xs min-h-[44px]",
                preset > maxPositionAmount
                  ? "opacity-50 cursor-not-allowed"
                  : amount === preset
                  ? "bg-kp-success hover:bg-kp-success/90"
                  : "border-kp-border hover:bg-kp-brand-hover"
              )}
            >
              {format(preset)}
              {preset > maxPositionAmount && (
                <span className="ml-1 text-[10px]">(max)</span>
              )}
            </Button>
          ))}
      </div>

      {/* Paper trading reminder */}
      <div className="bg-kp-brand-subtle border border-kp-brand/30 rounded-lg p-3 flex items-center gap-3">
        <span className="text-xl">🎮</span>
        <div className="text-sm">
          <p className="text-kp-brand font-medium">{t("paperTrading.title")}</p>
          <p className="text-kp-brand-light text-xs">
            {t("paperTrading.description")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TradeAmountSlider;
