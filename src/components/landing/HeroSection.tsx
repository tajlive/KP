"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * HeroSection — aspirerende landing-hero.
 *
 * topReturn: topp-avkastning fra paper_accounts (samme kilde + eksklusjoner
 * som /api/leaderboard). undefined/null → ingen prosent-påstand vises.
 *
 * FIKS 2 (FACT-AUDIT): Hardkodede priser fjernet — «live»-label var falsk.
 * Prisdata hentes client-side av PriceTicker-komponenten på dashboard.
 */

export default function HeroSection({ topReturn }: { topReturn?: number }) {
  const t = useTranslations("landing");
  const hasReliableReturn = topReturn !== undefined && topReturn !== null;

  return (
    <section className="relative min-h-screen flex items-center bg-kp-bg-primary overflow-hidden">
      {/* Radial gradient — subtil blå glød øverst høgre */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,82,255,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full animate-fade-up">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Tekst-kolonne */}
          <div className="text-center lg:text-left space-y-6">
            <h1 className="font-display text-display-sm sm:text-display text-kp-text-primary tracking-tight">
              {t("hero.title")}
            </h1>
            <p className="text-body sm:text-body text-kp-text-secondary max-w-lg mx-auto lg:mx-0 animate-fade-in">
              {hasReliableReturn
                ? t("hero.subtitle", { pct: topReturn })
                : t("hero.subtitleGeneric")}
            </p>

            {/* CTA-knapper */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/no/register"
                className="animate-fade-up inline-flex items-center justify-center rounded-button bg-kp-brand px-8 py-4 text-kp-bg-primary font-bold shadow-lg shadow-kp-brand/20 hover:bg-kp-brand-dark transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                🚀 {t("hero.cta-primary")}
              </Link>
              <Link
                href="/no/jokertrade"
                className="animate-fade-up inline-flex items-center justify-center rounded-button border border-kp-border px-8 py-4 text-kp-text-primary font-bold hover:bg-kp-bg-hover transition-all duration-200"
                style={{ animationDelay: "0.2s" }}
              >
                🎭 {t("hero.cta-secondary")}
              </Link>
            </div>

            {/* Disclaimer */}
            <p className="text-caption text-kp-text-muted animate-fade-in">
              {t("hero.disclaimer")}
            </p>

            {/* MOBIL: mockup under CTA-folden — lazy, påvirker ikke LCP */}
            <div className="lg:hidden flex justify-center pt-2">
              <Image
                src="/images/hero-trade-mockup.png"
                alt={t("hero.mockupAlt")}
                width={539}
                height={976}
                loading="lazy"
                className="w-[220px] h-auto"
              />
            </div>
          </div>

          {/* DESKTOP: høgre kolonne — ekte produktbilde, over folden (LCP-kandidat) */}
          <div className="hidden lg:flex justify-center">
            <Image
              src="/images/hero-trade-mockup.png"
              alt={t("hero.mockupAlt")}
              width={539}
              height={976}
              priority
              className="w-[320px] xl:w-[360px] h-auto animate-float"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
