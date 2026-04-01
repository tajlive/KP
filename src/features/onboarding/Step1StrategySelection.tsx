"use client";

import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { STRATEGIES } from "./constants";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: "spring" as const, stiffness: 200 },
  }),
};

interface Step1StrategySelectionProps {
  selectedStrategy: string | null;
  onSelect: (strategyId: string) => void;
}

export function Step1StrategySelection({
  selectedStrategy,
  onSelect,
}: Step1StrategySelectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {STRATEGIES.map((strategy, i) => {
        const Icon = strategy.icon;
        const isSelected = selectedStrategy === strategy.id;

        return (
          <motion.div
            key={strategy.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card
              className={cn(
                "cursor-pointer border-2 p-4 transition-all hover:scale-[1.02]",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600",
              )}
              onClick={() => onSelect(strategy.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br",
                    strategy.color,
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">{strategy.name}</h3>
                  <p className="text-sm text-slate-400">
                    {strategy.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {strategy.risk} risiko
                </Badge>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
