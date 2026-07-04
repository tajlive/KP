"use client";

import { useTranslations } from "next-intl";
import { clampDCAConfig, DCA_CONSTRAINTS } from "@/lib/trading/dca-validation";
import type { StrategyType } from "@/lib/trading-api";

export function StrategyConfig({
  type,
  config,
  onChange,
}: {
  type: StrategyType;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const tCommon = useTranslations("trading");

  switch (type) {
    case "dca_trygg": {
      const dcaConfig = config as {
        weeklyAmount: number;
        btcAllocation: number;
        position_size?: number;
        interval_minutes?: number;
      };
      const clamped = clampDCAConfig({
        position_size: dcaConfig.position_size,
        interval_minutes: dcaConfig.interval_minutes,
      });
      const safeConfig = { ...dcaConfig, ...clamped };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="dca-weekly-amount"
              className="text-slate-400 text-sm"
            >
              Ukentlig beløp: {safeConfig.weeklyAmount} NOK
            </label>
            <input
              id="dca-weekly-amount"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={safeConfig.weeklyAmount}
              title="Ukentlig beløp"
              onChange={(e) =>
                onChange({ ...safeConfig, weeklyAmount: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="dca-btc-allocation"
              className="text-slate-400 text-sm"
            >
              BTC-fordeling: {safeConfig.btcAllocation}%
            </label>
            <input
              id="dca-btc-allocation"
              type="range"
              min="0"
              max="100"
              value={safeConfig.btcAllocation}
              title="BTC-fordeling"
              onChange={(e) =>
                onChange({ ...safeConfig, btcAllocation: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="dca-position-size"
              className="text-slate-400 text-sm"
            >
              Posisjonsstørrelse: {Math.round(safeConfig.position_size * 100)}%
              (maks {Math.round(DCA_CONSTRAINTS.maxPositionSize * 100)}%)
            </label>
            <input
              id="dca-position-size"
              type="range"
              min="0"
              max={String(DCA_CONSTRAINTS.maxPositionSize * 100)}
              step="1"
              value={Math.round(safeConfig.position_size * 100)}
              title="Posisjonsstørrelse"
              onChange={(e) =>
                onChange({
                  ...safeConfig,
                  position_size: Number(e.target.value) / 100,
                })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="dca-interval-minutes"
              className="text-slate-400 text-sm"
            >
              Intervall (minutter): {safeConfig.interval_minutes}
              (minst {DCA_CONSTRAINTS.minIntervalMinutes})
            </label>
            <input
              id="dca-interval-minutes"
              type="number"
              min={String(DCA_CONSTRAINTS.minIntervalMinutes)}
              step="60"
              value={safeConfig.interval_minutes}
              title="Intervall minutter"
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (!Number.isNaN(raw)) {
                  const clampedInterval = Math.max(
                    DCA_CONSTRAINTS.minIntervalMinutes,
                    Math.round(raw),
                  );
                  onChange({
                    ...safeConfig,
                    interval_minutes: clampedInterval,
                  });
                }
              }}
              className="w-full mt-1 rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
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
              htmlFor="trend-risk-per-trade"
              className="text-slate-400 text-sm"
            >
              Risiko per trade: {trendConfig.riskPerTrade}%
            </label>
            <input
              id="trend-risk-per-trade"
              type="range"
              min="1"
              max="5"
              value={trendConfig.riskPerTrade}
              title="Risiko per trade"
              onChange={(e) =>
                onChange({ ...config, riskPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="trend-stop-loss" className="text-slate-400 text-sm">
              Stop-loss: {trendConfig.stopLoss}%
            </label>
            <input
              id="trend-stop-loss"
              type="range"
              min="5"
              max="15"
              value={trendConfig.stopLoss}
              title="Stop-loss"
              onChange={(e) =>
                onChange({ ...config, stopLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
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
              htmlFor="multi-aggressiveness"
              className="text-slate-400 text-sm"
            >
              {tCommon("aggressiveness")}
            </label>
            <select
              id="multi-aggressiveness"
              value={multiConfig.aggressiveness}
              title={tCommon("aggressiveness")}
              onChange={(e) =>
                onChange({ ...config, aggressiveness: e.target.value })
              }
              className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
            >
              <option value="forsiktig">{tCommon("conservativeOption")}</option>
              <option value="normal">{tCommon("normalOption")}</option>
              <option value="aggressiv">{tCommon("aggressiveOption")}</option>
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
                htmlFor="grid-upper-price"
                className="text-slate-400 text-sm"
              >
                Øvre pris
              </label>
              <input
                id="grid-upper-price"
                type="number"
                value={gridConfig.upperPrice}
                title="Øvre pris"
                onChange={(e) =>
                  onChange({ ...config, upperPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label
                htmlFor="grid-lower-price"
                className="text-slate-400 text-sm"
              >
                Nedre pris
              </label>
              <input
                id="grid-lower-price"
                type="number"
                value={gridConfig.lowerPrice}
                title="Nedre pris"
                onChange={(e) =>
                  onChange({ ...config, lowerPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="grid-levels" className="text-slate-400 text-sm">
              Grid-nivåer: {gridConfig.levels}
            </label>
            <input
              id="grid-levels"
              type="range"
              min="5"
              max="50"
              value={gridConfig.levels}
              title="Grid-nivåer"
              onChange={(e) =>
                onChange({ ...config, levels: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="grid-capital" className="text-slate-400 text-sm">
              Kapital: {gridConfig.capital} NOK
            </label>
            <input
              id="grid-capital"
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={gridConfig.capital}
              title="Kapital"
              onChange={(e) =>
                onChange({ ...config, capital: Number(e.target.value) })
              }
              className="w-full mt-1"
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
              htmlFor="ai-max-per-trade"
              className="text-slate-400 text-sm"
            >
              Maks per trade: {aiConfig.maxPerTrade} NOK
            </label>
            <input
              id="ai-max-per-trade"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={aiConfig.maxPerTrade}
              title="Maks per trade"
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="ai-max-loss" className="text-slate-400 text-sm">
              Maks tap: {aiConfig.maxLoss} NOK
            </label>
            <input
              id="ai-max-loss"
              type="range"
              min="100"
              max="2000"
              step="100"
              value={aiConfig.maxLoss}
              title="Maks tap"
              onChange={(e) =>
                onChange({ ...config, maxLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    case "ensemble_ai": {
      const ensembleConfig = config as { maxPerTrade: number; autoAdjust: boolean };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="ensemble-max-per-trade"
              className="text-slate-400 text-sm"
            >
              Maks per trade: {ensembleConfig.maxPerTrade} NOK
            </label>
            <input
              id="ensemble-max-per-trade"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={ensembleConfig.maxPerTrade}
              title="Maks per trade"
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ensemble-auto-adjust"
              type="checkbox"
              checked={ensembleConfig.autoAdjust}
              onChange={(e) =>
                onChange({ ...config, autoAdjust: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-600"
            />
            <label htmlFor="ensemble-auto-adjust" className="text-slate-400 text-sm">
              {tCommon("ensembleAutoAdjustWeights")}
            </label>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
