"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Info, HelpCircle } from "lucide-react";
import { GapExplanationCard } from "./GapExplanationCard";

const GAP_KEYS = [
  "tca",
  "backtestGap",
  "fillRate",
  "signalDecay",
  "adverseSelection",
  "plAttribution",
  "marketImpact",
] as const;

export function GapExplanationSection() {
  const t = useTranslations("gapAnalysis");

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[#0052FF]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            {t("title")}
          </h2>
        </div>
        <p className="text-xs text-slate-500">{t("subtitle")}</p>
      </motion.div>

      {/* What is this box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-4 flex items-start gap-3"
      >
        <Info className="h-4 w-4 text-[#0052FF] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-slate-300">{t("whatIsThis")}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t("whatIsThisDesc")}</p>
        </div>
      </motion.div>

      {/* Gap cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GAP_KEYS.map((key, i) => (
          <GapExplanationCard key={key} gapKey={key} index={i} />
        ))}
      </div>
    </section>
  );
}
