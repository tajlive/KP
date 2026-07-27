"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const MODES = [
  {
    id: "manual" as const,
    emoji: "🖐️",
    color: "emerald",
    href: "/trade",
  },
  {
    id: "auto" as const,
    emoji: "🤖",
    color: "amber",
    href: "/dashboard/auto-trade",
  },
  {
    id: "joker" as const,
    emoji: "🎭",
    color: "violet",
    href: "/jokertrade",
  },
] as const;

function modeBorder(color: string) {
  const map: Record<string, string> = {
    emerald: "border-emerald-500/40 hover:border-emerald-400/60",
    amber: "border-amber-500/40 hover:border-amber-400/60",
    violet: "border-violet-500/40 hover:border-violet-400/60",
  };
  return map[color] ?? "border-kp-border hover:border-kp-border-light";
}

function modeBg(color: string) {
  const map: Record<string, string> = {
    emerald: "from-emerald-950/30 to-transparent",
    amber: "from-amber-950/30 to-transparent",
    violet: "from-violet-950/30 to-transparent",
  };
  return map[color] ?? "";
}

function modeAccent(color: string) {
  const map: Record<string, string> = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    violet: "text-violet-400",
  };
  return map[color] ?? "text-kp-brand";
}

export function TradingModesExplainer() {
  const t = useTranslations("landing");

  return (
    <section className="py-20 bg-kp-bg-primary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Konto-boks */}
        <div className="mb-12">
          <div className="bg-kp-bg-card border border-kp-border rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl mb-3">💳</div>
            <div className="text-2xl sm:text-3xl font-black text-kp-brand">
              100 000 kr
            </div>
            <div className="text-sm text-kp-text-muted mt-1">
              {t("modes.subtitle")}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-heading-sm sm:text-heading font-black text-kp-text-primary">
            {t("modes.title")}
          </h2>
        </div>

        {/* Tre mode-kort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((mode, i) => (
            <Link
              key={mode.id}
              href={`/no${mode.href}`}
              className="group relative animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={`relative overflow-hidden rounded-2xl border-2 ${modeBorder(mode.color)} bg-gradient-to-br ${modeBg(mode.color)} p-6 transition-all duration-200 hover:scale-[1.02] group-active:scale-[0.98]`}
              >
                {/* Ikon */}
                <div className="text-4xl mb-3">{mode.emoji}</div>

                {/* Namn og tagline */}
                <h3 className="font-bold text-kp-text-primary text-lg">
                  {t(`modes.${mode.id}.name`)}
                </h3>
                <p className={`text-sm font-medium mt-1 ${modeAccent(mode.color)}`}>
                  {t(`modes.${mode.id}.tagline`)}
                </p>
                <p className="text-xs text-kp-text-secondary mt-2">
                  {t(`modes.${mode.id}.description`)}
                </p>

                {/* Pil ved hover */}
                <span className={`absolute bottom-3 right-3 ${modeAccent(mode.color)} opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-1`}>
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
