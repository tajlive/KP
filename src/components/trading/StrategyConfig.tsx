"use client";

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
  switch (type) {
    case "dca_trygg": {
      const dcaConfig = config as {
        weeklyAmount: number;
        btcAllocation: number;
      };
      return (
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-slate-400 text-sm">
              Ukentlig beløp: {dcaConfig.weeklyAmount} NOK
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={dcaConfig.weeklyAmount}
              onChange={(e) =>
                onChange({ ...config, weeklyAmount: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              BTC-fordeling: {dcaConfig.btcAllocation}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={dcaConfig.btcAllocation}
              onChange={(e) =>
                onChange({ ...config, btcAllocation: Number(e.target.value) })
              }
              className="w-full mt-1"
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
            <label className="text-slate-400 text-sm">
              Risiko per trade: {trendConfig.riskPerTrade}%
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={trendConfig.riskPerTrade}
              onChange={(e) =>
                onChange({ ...config, riskPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Stop-loss: {trendConfig.stopLoss}%
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={trendConfig.stopLoss}
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
            <label className="text-slate-400 text-sm">Aggressivitet</label>
            <select
              value={multiConfig.aggressiveness}
              onChange={(e) =>
                onChange({ ...config, aggressiveness: e.target.value })
              }
              className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
            >
              <option value="forsiktig">Forsiktig</option>
              <option value="normal">Normal</option>
              <option value="aggressiv">Aggressiv</option>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-sm">Øvre pris</label>
              <input
                type="number"
                value={gridConfig.upperPrice}
                onChange={(e) =>
                  onChange({ ...config, upperPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm">Nedre pris</label>
              <input
                type="number"
                value={gridConfig.lowerPrice}
                onChange={(e) =>
                  onChange({ ...config, lowerPrice: Number(e.target.value) })
                }
                className="w-full mt-1 bg-slate-600 text-white rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Grid-nivåer: {gridConfig.levels}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={gridConfig.levels}
              onChange={(e) =>
                onChange({ ...config, levels: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Kapital: {gridConfig.capital} NOK
            </label>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={gridConfig.capital}
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
            <label className="text-slate-400 text-sm">
              Maks per trade: {aiConfig.maxPerTrade} NOK
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={aiConfig.maxPerTrade}
              onChange={(e) =>
                onChange({ ...config, maxPerTrade: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">
              Maks tap: {aiConfig.maxLoss} NOK
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={aiConfig.maxLoss}
              onChange={(e) =>
                onChange({ ...config, maxLoss: Number(e.target.value) })
              }
              className="w-full mt-1"
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
