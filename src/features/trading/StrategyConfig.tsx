"use client";

import { useTranslations } from "next-intl";
import { StrategyType } from "@/lib/trading-api";

interface StrategyConfigProps {
  type: StrategyType;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export function StrategyConfig({
  type,
  config,
  onChange,
}: StrategyConfigProps) {
  const t = useTranslations("trading.strategyConfig");

  switch (type) {
    case "dca_trygg": {
      const dcaConfig = config as {
        weeklyAmount: number;
        btcAllocation: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="stratcfg-dca-weekly"
              className="text-kp-text-muted text-sm"
            >
              {t("dca.weeklyAmount")}: {t("unit.nok", { value: dcaConfig.weeklyAmount })}
            </label>
            <input
              id="stratcfg-dca-weekly"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={dcaConfig.weeklyAmount}
              onChange={(e) =>
                onChange({ ...config, weeklyAmount: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor="stratcfg-dca-btc"
              className="text-kp-text-muted text-sm"
            >
              {t("dca.btcAllocation")}: {t("unit.percent", { value: dcaConfig.btcAllocation })}
            </label>
            <input
              id="stratcfg-dca-btc"
              type="range"
              min="0"
              max="100"
              value={dcaConfig.btcAllocation}
              onChange={(e) =>
                onChange({ ...config, btcAllocation: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
        </div>
      );
    }
    case "trend_balansert": {
      const trendConfig = config as { riskPerTrade: number; stopLoss: number };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="stratcfg-trend-risk"
              className="text-kp-text-muted text-sm"
            >
              {t("trend.riskPerTrade")}: {t("unit.percent", { value: trendConfig.riskPerTrade })}
            </label>
            <input
              id="stratcfg-trend-risk"
              type="range"
              min="1"
              max="5"
              value={trendConfig.riskPerTrade}
              onChange={(e) =>
                onChange({ ...config, riskPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor="stratcfg-trend-stoploss"
              className="text-kp-text-muted text-sm"
            >
              {t("trend.stopLoss")}: {t("unit.percent", { value: trendConfig.stopLoss })}
            </label>
            <input
              id="stratcfg-trend-stoploss"
              type="range"
              min="5"
              max="15"
              value={trendConfig.stopLoss}
              onChange={(e) =>
                onChange({ ...config, stopLoss: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
        </div>
      );
    }
    case "multisignal_aktiv": {
      const multiConfig = config as { aggressiveness: string };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="stratcfg-multi-agg"
              className="text-kp-text-muted text-sm"
            >
              {t("multisignal.aggressiveness")}
            </label>
            <select
              id="stratcfg-multi-agg"
              value={multiConfig.aggressiveness}
              onChange={(e) =>
                onChange({ ...config, aggressiveness: e.target.value })
              }
              className="w-full mt-1 bg-kp-input-bg border border-kp-input-border text-kp-input-text rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kp-brand focus:border-transparent"
            >
              <option value="forsiktig">{t("multisignal.levels.cautious")}</option>
              <option value="normal">{t("multisignal.levels.normal")}</option>
              <option value="aggressiv">{t("multisignal.levels.aggressive")}</option>
            </select>
          </div>
        </div>
      );
    }
    case "grid_bot": {
      const gridConfig = config as {
        upperPrice: number;
        lowerPrice: number;
        levels: number;
        capital: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="stratcfg-grid-upper"
                className="text-kp-text-muted text-sm"
              >
                {t("grid.upperPrice")}
              </label>
              <input
                id="stratcfg-grid-upper"
                type="number"
                value={gridConfig.upperPrice}
                onChange={(e) =>
                  onChange({ ...config, upperPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-kp-input-bg border border-kp-input-border text-kp-input-text rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kp-brand focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="stratcfg-grid-lower"
                className="text-kp-text-muted text-sm"
              >
                {t("grid.lowerPrice")}
              </label>
              <input
                id="stratcfg-grid-lower"
                type="number"
                value={gridConfig.lowerPrice}
                onChange={(e) =>
                  onChange({ ...config, lowerPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-kp-input-bg border border-kp-input-border text-kp-input-text rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kp-brand focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="stratcfg-grid-levels"
              className="text-kp-text-muted text-sm"
            >
              {t("grid.levels")}: {gridConfig.levels}
            </label>
            <input
              id="stratcfg-grid-levels"
              type="range"
              min="5"
              max="50"
              value={gridConfig.levels}
              onChange={(e) =>
                onChange({ ...config, levels: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor="stratcfg-grid-capital"
              className="text-kp-text-muted text-sm"
            >
              {t("grid.capital")}: {t("unit.nok", { value: gridConfig.capital })}
            </label>
            <input
              id="stratcfg-grid-capital"
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={gridConfig.capital}
              onChange={(e) =>
                onChange({ ...config, capital: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
        </div>
      );
    }
    case "ai_copy": {
      const aiConfig = config as { maxPerTrade: number; maxLoss: number };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="stratcfg-ai-max"
              className="text-kp-text-muted text-sm"
            >
              {t("aiCopy.maxPerTrade")}: {t("unit.nok", { value: aiConfig.maxPerTrade })}
            </label>
            <input
              id="stratcfg-ai-max"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={aiConfig.maxPerTrade}
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor="stratcfg-ai-loss"
              className="text-kp-text-muted text-sm"
            >
              {t("aiCopy.maxLoss")}: {t("unit.nok", { value: aiConfig.maxLoss })}
            </label>
            <input
              id="stratcfg-ai-loss"
              type="range"
              min="100"
              max="2000"
              step="100"
              value={aiConfig.maxLoss}
              onChange={(e) =>
                onChange({ ...config, maxLoss: Number(e.target.value) })
              }
              className="w-full mt-1 accent-kp-brand cursor-pointer"
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
