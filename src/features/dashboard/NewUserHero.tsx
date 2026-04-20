"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Sparkles, Target, Play, BarChart3, Coins } from "lucide-react";

interface NewUserHeroProps {
  userName?: string;
}

export function NewUserHero({ userName }: NewUserHeroProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.newUserHero");

  const steps = [
    {
      icon: Target,
      label: t("step1"),
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Play,
      label: t("step2"),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: BarChart3,
      label: t("step3"),
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-slate-900/50 to-slate-900 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                  {t("badge")}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {t("welcome", { name: userName || t("defaultName") })}
              </h2>
              <p className="text-slate-400 max-w-md">{t("subtitle")}</p>

              {/* 3-step quick start */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${step.bg} flex items-center justify-center`}
                      >
                        <Icon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {step.label}
                      </span>
                      {i < steps.length - 1 && (
                        <span className="hidden sm:inline text-slate-600 ml-1">
                          →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("demoHint")}</span>
              </div>
            </div>

            <Link href={`/${locale}/dashboard/auto-trade`}>
              <Button
                size="lg"
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl px-8 py-6 text-base shadow-lg shadow-brand-500/20 whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t("cta")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
