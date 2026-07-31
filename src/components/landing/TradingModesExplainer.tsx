"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ManualIllustration,
  AutoIllustration,
  PilotIllustration,
} from "./Illustrations";

const MODES = [
  {
    id: "manual" as const,
    Illustration: ManualIllustration,
    color: "emerald",
    href: "/trade",
  },
  {
    id: "auto" as const,
    Illustration: AutoIllustration,
    color: "amber",
    href: "/dashboard/auto-trade",
  },
  {
    id: "pilot" as const,
    Illustration: PilotIllustration,
    color: "violet",
    href: "/dashboard/jokertrade",
  },
] as const;

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
  const locale = useLocale();

  return (
    <section
      id="hvordan-det-fungerer"
      className="py-12 sm:py-20 bg-kp-bg-primary scroll-mt-20"
    >
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

        {/* Tre mode-kort — farge identifiserer modus, fill bærer hierarkiet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((mode, i) => (
            <Link
              key={mode.id}
              href={`/${locale}${mode.href}`}
              className="group relative animate-fade-up rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className={`relative h-full overflow-hidden rounded-2xl border border-kp-border bg-gradient-to-br ${modeBg(mode.color)} p-6 transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:border-kp-border-dark group-active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:group-active:scale-100`}
              >
                {/* Ikon */}
                <div className={`mb-3 flex justify-center ${modeAccent(mode.color)}`}>
                  <mode.Illustration />
                </div>

                {/* Namn og tagline */}
                <h3 className="font-bold text-kp-text-primary text-lg">
                  {t(`modes.${mode.id}.name`)}
                </h3>
                <p className={`text-sm font-medium mt-1 ${modeAccent(mode.color)}`}>
                  {t(`modes.${mode.id}.tagline`)}
                </p>
                <p className="text-sm text-kp-text-secondary mt-2">
                  {t(`modes.${mode.id}.description`)}
                </p>

                {/* Pil ved hover */}
                <span className={`absolute bottom-3 right-3 ${modeAccent(mode.color)} opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 group-hover:translate-x-0 translate-x-1 motion-reduce:transition-none`}>
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
