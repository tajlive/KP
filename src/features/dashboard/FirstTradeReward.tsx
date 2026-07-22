"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { PartyPopper, X, Coins, TrendingUp } from "lucide-react";

interface FirstTradeRewardProps {
  totalTrades: number;
}

const REWARD_DISMISSED_KEY = "kp_first_trade_reward_dismissed";

export function FirstTradeReward({ totalTrades }: FirstTradeRewardProps) {
  const t = useTranslations("dashboard.firstTradeReward");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(REWARD_DISMISSED_KEY) === "true";
    // Kun ved faktisk første handel (1 trade). Tidligere: totalTrades > 0,
    // som viste "Gratulerer med din første handel" også for erfarne brukere.
    if (totalTrades === 1 && !wasDismissed) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [totalTrades]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(REWARD_DISMISSED_KEY, "true");
  };

  if (totalTrades !== 1 || dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-gray-50 to-gray-50 dark:via-slate-900 dark:to-slate-900 overflow-hidden relative">
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: [
                      "#F59E0B",
                      "#EF4444",
                      "#3B82F6",
                      "#10B981",
                      "#8B5CF6",
                    ][i % 5],
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${10 + (i * 13) % 60}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.8, 1, 0.8],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2 + (i % 3),
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <PartyPopper className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t("title")}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {t("subtitle")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {t("description")}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full shrink-0"
                  aria-label={t("dismiss")}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t("stats", { count: totalTrades })}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
