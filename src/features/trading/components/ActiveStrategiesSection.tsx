"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { UserStrategy, StrategyType } from "@/lib/trading-api";
import { useCurrency } from "@/hooks/useCurrency";

export function ActiveStrategiesSection({
  activeStrategies,
  onStop,
  formatNOK,
  strategies: STRATEGIES,
}: {
  activeStrategies: UserStrategy[];
  onStop: (type: StrategyType) => void;
  formatNOK: (v: number) => string;
  strategies: {
    type: StrategyType;
    icon: ReactNode;
    risk: number;
    name: string;
    description: string;
  }[];
}) {
  const { formatByMode } = useCurrency();
  const t = useTranslations("trading.activeStrategiesPanel");
  if (activeStrategies.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">{t("title")}</h2>
        <p className="text-slate-300 text-sm">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{t("title")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeStrategies.map((strategy) => {
          const info = STRATEGIES.find((s) => s.type === strategy.strategy_id);
          return (
            <div
              key={strategy.id}
              className="bg-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-300">
                  {info?.icon}
                  <span className="font-medium text-white">{info?.name}</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  {t("pnlLine", {
                    pnl: formatByMode(strategy.total_pnl, strategy.mode),
                    count: strategy.total_trades,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStop(strategy.strategy_id)}
                className="px-4 py-2 min-h-[44px] bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm font-medium"
              >
                {t("stop")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
