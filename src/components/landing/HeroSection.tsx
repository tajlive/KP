'use server';

import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeroAudienceChips } from '@/components/landing/HeroAudienceChips';
import { HeroPrimaryActions } from '@/components/landing/HeroPrimaryActions';
import { BRAND_COLOR, HERO } from '@/lib/design/tokens';

/**
 * HeroSection — MOBILE-FIRST OPTIMIZED (27.03.2026)
 * KEY CHANGES:
 * 1. Remove mesh-background from mobile (GPU-heavy)
 * 2. Responsive text: 3xl (mobile) → 4xl (tablet) → 6xl (desktop)
 * 3. CTA buttons: flex-col (mobile) → flex-row (tablet+)
 * 4. Mockup-billede: hidden on mobile, fade-in on lg+
 * 5. LCP element (h1) has NO animations
 */

type HeroSectionProps = { locale?: string };

export default async function HeroSection({ locale = 'no' }: HeroSectionProps) {
  const t = await getTranslations({ locale, namespace: 'landing.modernHero' });

  const titlePart2MutedPrefix = t('titlePart2MutedPrefix');
  const titlePart2MutedSuffix = t('titlePart2MutedSuffix');
  const titlePart2Emphasis = t('titlePart2Emphasis');
  const heroTitleLine2UsesMuted =
    titlePart2MutedPrefix.trim().length > 0 ||
    titlePart2MutedSuffix.trim().length > 0;

  return (
    <section
      className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0052FF] to-[#1e40af] px-4 sm:px-6 lg:px-8`}
    >
      {/* MOBILE: NO mesh background — CSS gradient only */}
      {/* DESKTOP: Mesh visible via hidden lg:block */}
      <div
        className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl hidden lg:block"
        style={{
          background: `radial-gradient(circle, ${BRAND_COLOR.DEFAULT} 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full opacity-25 blur-3xl hidden lg:block"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      {/* Subtle grid overlay — DESKTOP ONLY */}
      <div className="absolute inset-0 opacity-10 hidden lg:block">
        <div className="absolute inset-0 bg-grid-pattern" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full py-16 sm:py-20 lg:py-32">
        {/* RESPONSIVE GRID: 1-col mobile, 2-col desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT: Copy — LCP CRITICAL PATH */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 ${HERO.badge} text-xs sm:text-sm font-semibold mb-4 sm:mb-6`}
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <span className="truncate">{t('badge')}</span>
            </div>

            {/* H1 — RESPONSIVE SIZES: NO ANIMATIONS ON LCP */}
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight line-clamp-4">
              {t('titlePart1')}
              <br />
              {heroTitleLine2UsesMuted ? (
                <span className="inline-block">
                  <span className={HERO.titleMuted}>{titlePart2MutedPrefix}</span>
                  <span className={HERO.titleAccent}>{titlePart2Emphasis}</span>
                  <span className={HERO.titleMuted}>{titlePart2MutedSuffix}</span>
                </span>
              ) : (
                <span className={HERO.titleAccent}>{titlePart2Emphasis}</span>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-blue-50 mb-4 sm:mb-6 leading-relaxed">
              {t('subtitle')}
            </p>

            {/* Bullets/features */}
            <p className="text-sm sm:text-base lg:text-lg text-blue-100/90 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0">
              {t('bullets')}
            </p>

            {/* Audience chips — HIDDEN on very small phones */}
            <div className="mb-6 sm:mb-8 hidden sm:block">
              <HeroAudienceChips />
            </div>

            {/* CTA BUTTONS: Stack on mobile, inline on tablet+ */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center lg:justify-start">
              <HeroPrimaryActions locale={locale} />
            </div>
          </div>

          {/* RIGHT: Mockup — HIDDEN ON MOBILE */}
          <div className="relative hidden lg:flex lg:items-center lg:justify-center animate-fade-in-delayed">
            {/* Browser mockup container */}
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-[#0052FF]/15 ring-1 ring-white/20 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
              {/* Browser chrome */}
              <div className="bg-slate-900 px-3 sm:px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-2 sm:ml-4 bg-slate-800 rounded px-2 sm:px-3 py-1 min-w-0">
                  <span className="text-slate-400 text-xs font-mono truncate block">
                    {t('mockupUrl')}
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-medium">{t('mockupPaperLabel')}</div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums tracking-tight">
                      {t('mockupBalance')}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} aria-hidden />
                    <span className="hidden sm:inline">{t('mockupRiskFree')}</span>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="bg-white rounded-xl p-3 sm:p-4 mb-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">{t('mockupChartPair')}</span>
                    <span className="text-xs text-slate-500 tabular-nums">{t('mockupChartTimeframe')}</span>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full h-14 sm:h-16" aria-hidden>
                    <defs>
                      <linearGradient id="heroMockupChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={BRAND_COLOR.DEFAULT} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={BRAND_COLOR.DEFAULT} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12 L 200,60 L 0,60 Z"
                      fill="url(#heroMockupChartFill)"
                    />
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12"
                      stroke={BRAND_COLOR.DEFAULT}
                      strokeWidth="2"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>

                {/* Mini stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{t('mockupHigh')}</span>
                    <span className="font-mono text-slate-900 font-semibold">$68,450</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{t('mockupLow')}</span>
                    <span className="font-mono text-slate-900 font-semibold">$62,100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
