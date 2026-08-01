"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TradeMode = "manual" | "auto" | "joker";

interface ModeCard {
  id: TradeMode;
  label: string;
  tagline: string;
  description: string;
  who: string;
  href: string;
  accent: string;    // Tailwind border color
  bg: string;         // Tailwind bg gradient
  dot: string;        // Pulse dot color
  badge: string;      // Badge text
}

const MODES: ModeCard[] = [
  {
    id: "manual",
    label: "Manuell",
    tagline: "Du bestemmer alt",
    description: "Kjøp og selg selv. Full kontroll over hver trade. Lær mens du handler.",
    who: "For deg som vil lære",
    href: "/trade",
    accent: "border-emerald-500/60 hover:border-emerald-400",
    bg: "from-emerald-950/40 to-emerald-900/20",
    dot: "bg-emerald-400",
    badge: "📊 LÆRING",
  },
  {
    id: "auto",
    label: "Auto",
    tagline: "Du + AI sammen",
    description: "Sett dine regler og strategi. AI-en utfører handlene for deg — du beholder kontrollen.",
    who: "For deg som vil effektivisere",
    href: "/dashboard/auto-trade",
    accent: "border-amber-500/60 hover:border-amber-400",
    bg: "from-amber-950/40 to-amber-900/20",
    dot: "bg-amber-400",
    badge: "⚡ EFFEKTIV",
  },
  {
    id: "joker",
    label: "Pilot",
    tagline: "AI bestemmer alt",
    description: "Vår AI analyserer markedet, velger handler og utfører. Du lener deg tilbake.",
    who: "For deg med lite tid",
    href: "/pilot",
    accent: "border-violet-500/60 hover:border-violet-400",
    bg: "from-violet-950/40 to-violet-900/20",
    dot: "bg-violet-400",
    badge: "🃏 AUTOMATISK",
  },
];

function PulseDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
            color,
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", color)} />
    </span>
  );
}

export function TradingModeSelector({ activeMode }: { activeMode?: TradeMode }) {
  const locale = useLocale();
  const t = useTranslations("trading");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {t("modeSelector.title")}
        </h3>
        <span className="h-px flex-1 bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;

          return (
            <Link
              key={mode.id}
              href={`/${locale}${mode.href}`}
              className="group relative"
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200",
                  "bg-gradient-to-br",
                  mode.bg,
                  mode.accent,
                  isActive && "ring-2 ring-offset-2 ring-offset-[#0B0F19]",
                  isActive && mode.accent.replace("border-", "ring-"),
                )}
              >
                {/* Active glow */}
                {isActive && (
                  <div
                    className={cn(
                      "absolute inset-0 opacity-10 blur-xl",
                      mode.dot.replace("bg-", "bg-"),
                    )}
                  />
                )}

                <div className="relative z-10 space-y-2">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PulseDot color={mode.dot} active={isActive} />
                      <span className="font-bold text-white text-base">
                        {mode.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        "bg-white/10 text-slate-300",
                      )}
                    >
                      {mode.badge}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-sm font-medium text-slate-200 leading-snug">
                    {mode.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Who */}
                  <div className="pt-1 border-t border-white/10">
                    <p className="text-[11px] text-slate-500 italic">
                      {mode.who}
                    </p>
                  </div>

                  {/* CTA arrow */}
                  <div
                    className={cn(
                      "absolute bottom-3 right-3 text-lg opacity-0 group-hover:opacity-100 transition-opacity",
                      "translate-x-1 group-hover:translate-x-0 transition-transform",
                    )}
                  >
                    →
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
