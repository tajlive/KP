"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * HeroSection — landing-hero (redaktørstyrt copy, REDAKTORPLAN-V2).
 *
 * FIKS 2026-07-29:
 * - topReturn-mekanikk fjernet (gevinstløfte i hero er forbudt).
 * - Ett primær-CTA-hierarki: «Start gratis» + stille ankerlenke.
 * - Knapp etter kontrakt: hover lift 1.02 / press 0.97, 100–160ms,
 *   ease-out cubic-bezier(0.23,1,0.32,1), respekterer reduced-motion.
 * - Hvit CTA-tekst (WCAG AA mot #0052ff — tidligere mørk tekst på blå).
 */

const CTA_EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export default function HeroSection() {
  const t = useTranslations("landing");
  const locale = useLocale();

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
            {/* Badge/pille — beta + KLT-insentiv */}
            <p className="inline-flex items-center rounded-badge border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
              {t("hero.badge")}
            </p>

            <h1 className="font-sans text-display-sm sm:text-display font-extrabold text-kp-text-primary tracking-tight text-balance">
              {t("hero.title")}
            </h1>
            <p className="text-body text-kp-text-secondary max-w-lg mx-auto lg:mx-0 animate-fade-in">
              {t("hero.subtitle")}
            </p>

            {/* CTA-hierarki: én primær handling + stille sekundær lenke */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-center lg:justify-start">
              <Link
                href={`/${locale}/register`}
                className={`animate-fade-up inline-flex min-h-[48px] items-center justify-center rounded-button bg-kp-brand px-8 py-3.5 text-white font-bold shadow-lg shadow-kp-brand/20 transition-[transform,background-color] duration-150 ${CTA_EASE} hover:bg-kp-brand-dark hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-kp-bg-primary`}
              >
                {t("hero.cta-primary")}
              </Link>
              <a
                href="#hvordan-det-fungerer"
                className={`animate-fade-up inline-flex min-h-[48px] items-center justify-center px-2 text-kp-text-secondary font-medium underline-offset-4 transition-colors duration-150 ${CTA_EASE} hover:text-kp-text-primary hover:underline motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-brand-light rounded-button`}
                style={{ animationDelay: "0.08s" }}
              >
                {t("hero.cta-secondary")}
              </a>
            </div>

            {/* Stille tillitslinje under CTA */}
            <p className="text-sm text-kp-text-muted animate-fade-in">
              {t("hero.trustNote")}
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
              className="w-[320px] xl:w-[360px] h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
