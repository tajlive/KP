"use client";

import { StrategyType, TradingMode, UserStrategy } from "@/lib/trading-api";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Play, Square } from "lucide-react";
import { StrategyConfig } from "./StrategyConfig";

interface StrategySelectorSectionProps {
  strategies: {
    type: StrategyType;
    name: string;
    icon: string;
    risk: number;
    description: string;
  }[];
  activeStrategies: UserStrategy[];
  expandedStrategy: StrategyType | null;
  setExpandedStrategy: (t: StrategyType | null) => void;
  strategyConfigs: Record<StrategyType, Record<string, unknown>>;
  setStrategyConfigs: React.Dispatch<
    React.SetStateAction<Record<StrategyType, Record<string, unknown>>>
  >;
  onStart: (t: StrategyType) => void;
  onStop: (t: StrategyType) => void;
  mode: TradingMode;
  isStarting: StrategyType | null;
}

const RISK_COLORS: Record<number, string> = {
  1: "text-green-400",
  2: "text-blue-400",
  3: "text-yellow-400",
  4: "text-orange-400",
  5: "text-red-400",
};

export function StrategySelectorSection({
  strategies,
  activeStrategies,
  expandedStrategy,
  setExpandedStrategy,
  strategyConfigs,
  setStrategyConfigs,
  onStart,
  onStop,
  mode,
  isStarting,
}: StrategySelectorSectionProps) {
  const isActive = (type: StrategyType) =>
    activeStrategies.some((s) => s.strategy_id === type);

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Velg strategi</h2>

      {mode === "paper" && (
        <p className="text-blue-400 text-sm mb-4">
          💡 Paper mode — ingen ekte penger
        </p>
      )}

      <div className="space-y-3">
        {strategies.map((strategy) => {
          const active = isActive(strategy.type);
          const expanded = expandedStrategy === strategy.type;

          return (
            <div
              key={strategy.type}
              className="bg-slate-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-600 transition"
                onClick={() =>
                  setExpandedStrategy(expanded ? null : strategy.type)
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{strategy.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {strategy.name}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < strategy.risk
                                ? RISK_COLORS[strategy.risk]
                                : "text-slate-600"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {active ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Aktiv
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Ikke startet</span>
                  )}
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-slate-600">
                      <StrategyConfig
                        type={strategy.type}
                        config={strategyConfigs[strategy.type]}
                        onChange={(newConfig) =>
                          setStrategyConfigs((prev) => ({
                            ...prev,
                            [strategy.type]: newConfig,
                          }))
                        }
                      />
                      <div className="flex gap-3 mt-4">
                        {active ? (
                          <button
                            onClick={() => onStop(strategy.type)}
                            className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition flex items-center justify-center gap-2"
                          >
                            <Square className="w-4 h-4" />
                            Stopp strategi
                          </button>
                        ) : (
                          <button
                            onClick={() => onStart(strategy.type)}
                            disabled={isStarting === strategy.type}
                            className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isStarting === strategy.type ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                Starter...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Start strategi
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
