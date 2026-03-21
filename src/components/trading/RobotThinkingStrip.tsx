"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const LINE_KEYS = [
  "line1",
  "line2",
  "line3",
  "line4",
  "line5",
  "line6",
] as const;

export function RobotThinkingStrip({
  className,
  compact = false,
}: {
  className?: string;
  /** Kompakt variant (f.eks. øverst i narrativ-kort) */
  compact?: boolean;
}) {
  const t = useTranslations("trading.robotBrain");
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setLineIndex((i) => (i + 1) % LINE_KEYS.length),
      2800,
    );
    return () => clearInterval(id);
  }, []);

  const key = LINE_KEYS[lineIndex];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-linear-to-r from-slate-950 via-slate-900 to-slate-950",
        compact ? "py-3 px-4" : "py-4 px-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={t("ariaLabel")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.4) 2px, rgba(34,211,238,0.4) 3px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(6,182,212,0.12),transparent_50%)]" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-400/30"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bot className="h-5 w-5 text-cyan-300" aria-hidden />
            <motion.span
              className="absolute inset-0 rounded-xl border border-cyan-400/40"
              animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400/90">
              <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t("badge")}</span>
              <span className="flex gap-0.5" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="inline-block h-1 w-1 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: d * 0.2,
                    }}
                  />
                ))}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  "mt-1 font-mono text-sm text-slate-200 leading-snug",
                  compact && "text-xs sm:text-sm",
                )}
              >
                {t(key)}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          {(["scan", "risk", "signal"] as const).map((chip, idx) => (
            <motion.span
              key={chip}
              initial={false}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: idx * 0.35,
              }}
              className="rounded-lg border border-slate-600/60 bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400"
            >
              {t(`chip_${chip}`)}
            </motion.span>
          ))}
        </div>
      </div>

      <p className="relative mt-2 text-[10px] text-slate-500 leading-tight">
        {t("disclaimer")}
      </p>
    </div>
  );
}
