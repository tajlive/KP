"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Bot, TrendingUp, Shield, BarChart3, Grid3X3, ArrowRight } from "lucide-react";

interface StrategyCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
}

export function EmptyBotState() {
  const t = useTranslations("dashboard.emptyBotState");
  const router = useRouter();
  const locale = (useParams()?.locale as string) ?? "no";

  const strategies: StrategyCard[] = [
    {
      id: "dca",
      name: t("dca.name"),
      description: t("dca.description"),
      icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
      color: "text-blue-400",
      borderColor: "border-blue-500/30 hover:border-blue-500/50",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "grid",
      name: t("grid.name"),
      description: t("grid.description"),
      icon: <Grid3X3 className="w-6 h-6 text-emerald-400" />,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30 hover:border-emerald-500/50",
      bgColor: "bg-emerald-500/10",
    },
    {
      id: "trend",
      name: t("trend.name"),
      description: t("trend.description"),
      icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
      color: "text-purple-400",
      borderColor: "border-purple-500/30 hover:border-purple-500/50",
      bgColor: "bg-purple-500/10",
    },
  ];

  const handleSelectStrategy = (strategyId: string) => {
    router.push(`/${locale}/dashboard/auto-trade?strategy=${strategyId}`);
  };

  return (
    <Card className="mb-6 border-dashed border-slate-600 bg-slate-900/50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
            <Bot className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {t("title")}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {t("subtitle")}
          </p>
        </div>

        {/* Strategy Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {strategies.map((strategy, index) => (
            <motion.button
              key={strategy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectStrategy(strategy.id)}
              className={`group relative p-4 rounded-xl border ${strategy.borderColor} bg-slate-800/40 hover:bg-slate-800/60 transition-all text-left`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${strategy.bgColor} flex items-center justify-center shrink-0`}
                >
                  {strategy.icon}
                </div>
                <div className="min-w-0">
                  <h4 className={`font-semibold text-sm ${strategy.color}`}>
                    {strategy.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {strategy.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                <span>{t("select")}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Safety hint */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>{t("safetyHint")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
