"use client";

import { StrategyType, UserStrategy } from "@/lib/trading-api";

interface ActiveStrategiesSectionProps {
  activeStrategies: UserStrategy[];
  onStop: (type: StrategyType) => void;
  formatNOK: (v: number) => string;
  strategies: { type: StrategyType; name: string; icon: string }[];
}

export function ActiveStrategiesSection({
  activeStrategies,
  onStop,
  formatNOK,
  strategies,
}: ActiveStrategiesSectionProps) {
  if (activeStrategies.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Aktive strategier
        </h2>
        <p className="text-slate-400 text-sm">
          Ingen aktive strategier. Velg en strategi nedenfor for å starte.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Aktive strategier
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeStrategies.map((strategy) => {
          const info = strategies.find(
            (s) => s.type === strategy.strategy_id,
          );
          return (
            <div
              key={strategy.id}
              className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info?.icon}</span>
                  <span className="font-medium text-white">{info?.name}</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  P&L: {formatNOK(strategy.total_pnl)} • {strategy.total_trades}{" "}
                  handler
                </p>
              </div>
              <button
                onClick={() => onStop(strategy.strategy_id)}
                className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition text-sm"
              >
                Stopp
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
