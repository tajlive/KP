"use client";

import { PulseMode } from "@/types/pulse";
import { motion } from "framer-motion";
import { FileText, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

interface PulseModeToggleProps {
  mode: PulseMode;
  onModeChange: (mode: PulseMode) => void;
}

export function PulseModeToggle({ mode, onModeChange }: PulseModeToggleProps) {
  const t = useTranslations("dashboard.pulse");

  return (
    <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5 shadow-inner">
      <button
        onClick={() => onModeChange("paper")}
        className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 outline-none ${
          mode === "paper"
            ? "text-white"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <span className="relative z-10 flex items-center gap-2">
          <FileText
            className={`w-4 h-4 ${mode === "paper" ? "text-blue-400" : "text-slate-600"}`}
          />
          {t("paperMode")}
        </span>
        {mode === "paper" && (
          <motion.div
            layoutId="pulse-mode-active"
            className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>

      <button
        onClick={() => onModeChange("live")}
        className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 outline-none ${
          mode === "live" ? "text-white" : "text-slate-500 hover:text-slate-400"
        }`}
      >
        <span className="relative z-10 flex items-center gap-2">
          <Zap
            className={`w-4 h-4 ${mode === "live" ? "text-red-400" : "text-slate-600"}`}
          />
          {t("liveMode")}
        </span>
        {mode === "live" && (
          <motion.div
            layoutId="pulse-mode-active"
            className="absolute inset-0 bg-red-500/10 border border-red-500/20 rounded-xl"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>
    </div>
  );
}
