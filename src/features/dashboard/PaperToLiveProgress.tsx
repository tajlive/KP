"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Lock, TrendingUp, Zap } from "lucide-react";

interface PaperToLiveProgressProps {
  totalTrades: number;
  winningTrades?: number;
}

const TARGET_TRADES = 5;

export function PaperToLiveProgress({
  totalTrades,
  winningTrades,
}: PaperToLiveProgressProps) {
  const t = useTranslations("dashboard.paperToLive");
  const progress = Math.min((totalTrades / TARGET_TRADES) * 100, 100);
  const isUnlocked = totalTrades >= TARGET_TRADES;
  const remaining = Math.max(TARGET_TRADES - totalTrades, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card
        className={`overflow-hidden ${
          isUnlocked
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900"
            : "border-slate-700 bg-slate-900"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isUnlocked ? "bg-emerald-500/20" : "bg-slate-800"
                }`}
              >
                {isUnlocked ? (
                  <Zap className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t("title")}
                </h3>
                <p className="text-xs text-slate-400">
                  {t("progress", { current: totalTrades, target: TARGET_TRADES })}
                </p>
              </div>
            </div>
            {winningTrades !== undefined && winningTrades > 0 && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                <span>
                  {t("winningTrades", { count: winningTrades })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-slate-800" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {isUnlocked
                  ? t("unlocked")
                  : t("unlockText", { remaining })}
              </p>
              <span
                className={`text-xs font-bold ${
                  isUnlocked ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
