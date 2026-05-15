"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { RADIUS, SHADOW } from "@/lib/design/tokens";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Activity,
  Zap,
  ShieldAlert,
  BarChart3,
  Scale,
} from "lucide-react";

interface GapExplanationCardProps {
  gapKey: string;
  index?: number;
}

const gapIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  tca: Activity,
  backtestGap: BarChart3,
  fillRate: Scale,
  signalDecay: Zap,
  adverseSelection: ShieldAlert,
  plAttribution: TrendingUp,
  marketImpact: TrendingDown,
};

export function GapExplanationCard({ gapKey, index = 0 }: GapExplanationCardProps) {
  const t = useTranslations("gapAnalysis");
  const [expanded, setExpanded] = useState(false);

  const Icon = gapIcons[gapKey] || Activity;
  const title = t(`gaps.${gapKey}.title`);
  const shortDesc = t(`gaps.${gapKey}.shortDesc`);
  const fullDesc = t(`gaps.${gapKey}.fullDesc`);
  const alertDesc = t(`gaps.${gapKey}.alertDesc`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={`group relative overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 ${RADIUS.card} ${SHADOW.card} hover:border-[#0052FF]/30 transition-all`}
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#0052FF]/60 via-[#0052FF]/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/40 focus:ring-inset rounded-lg"
        aria-expanded={expanded}
      >
        <div className="mt-0.5 flex-shrink-0">
          <div className="h-10 w-10 rounded-lg bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center group-hover:bg-[#0052FF]/15 transition-colors">
            <Icon className="h-5 w-5 text-[#0052FF]" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-[#0052FF] transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {shortDesc}
          </p>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-slate-800/50">
              <div className="pt-4 space-y-4">
                {/* Full description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {fullDesc}
                </p>

                {/* Alert section */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">
                        {t("gaps.tca.alertTitle")}
                      </p>
                      <p className="mt-1 text-xs text-amber-200/70 leading-relaxed">
                        {alertDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
