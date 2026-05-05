"use client";

import { useState } from "react";
import { startStrategy, stopStrategy, type StrategyType, type TradingMode } from "@/lib/trading-api";
import { useI18nToast } from "@/hooks/useI18nToast";

interface UseStrategyActionsOptions {
  mode: TradingMode;
  strategyConfigs: Record<StrategyType, Record<string, unknown>>;
  onSuccess: () => void;
}

interface UseStrategyActionsResult {
  isStarting: StrategyType | null;
  handleStartStrategy: (strategyType: StrategyType) => Promise<void>;
  handleStopStrategy: (strategyType: StrategyType) => Promise<void>;
}

export function useStrategyActions({
  mode,
  strategyConfigs,
  onSuccess,
}: UseStrategyActionsOptions): UseStrategyActionsResult {
  const [isStarting, setIsStarting] = useState<StrategyType | null>(null);
  const { success: showSuccess, error: showToastError } = useI18nToast();

  const handleStartStrategy = async (strategyType: StrategyType) => {
    try {
      setIsStarting(strategyType);
      const config = strategyConfigs[strategyType] as Record<string, unknown>;
      await startStrategy(strategyType, mode, config);

      const response = await fetch("/api/trading/trigger", { method: "POST" });
      if (!response.ok) {
        // Strategy trigger returned non-OK — error already shown to user via toast
      }

      showSuccess("toasts.strategy.started");
      onSuccess();
    } catch (_) {
      showToastError("toasts.strategy.startFailed");
    } finally {
      setIsStarting(null);
    }
  };

  const handleStopStrategy = async (strategyType: StrategyType) => {
    try {
      await stopStrategy(strategyType, mode);
      showSuccess("toasts.strategy.stopped");
      onSuccess();
    } catch (_) {
      showToastError("toasts.strategy.stopFailed");
    }
  };

  return { isStarting, handleStartStrategy, handleStopStrategy };
}
