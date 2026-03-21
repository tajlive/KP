import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeroAudienceChips } from "@/components/landing/HeroAudienceChips";
import { HeroPrimaryActions } from "@/components/landing/HeroPrimaryActions";
import { BRAND_COLOR, HERO } from "@/lib/design/tokens";

/**
 * HeroSection - Server Component (no "use client")
 *
 * KEY OPTIMIZATIONS from previous version:
 * - No "use client" directive - renders on server
 * - No framer-motion - pure CSS only
 * - No useRouter - uses native Link component
 * - Single Lucide icon (`Check`) in mockup only; badge/CTA remain inline SVG
 * - No animated scroll indicator
 * - NO CSS animations on LCP element (removed animate-fade-in)
 *
 * LCP OPTIMIZATION (Task 3):
 * - Removed animate-fade-in from LCP container to prevent animation delay
 * - Kept animation on mockup (below-fold on mobile, acceptable delay)
 * - h1 renders immediately without transition/animation blocking
 *
 * This eliminates ~30KB+ JS from the critical path
 * and removes hydration blocking for LCP.
 */

type HeroSectionProps = { locale?: string };

export default async function HeroSection({ locale = "no" }: HeroSectionProps) {
  // Bruk alltid sidens locale så hero ikke viser feil språk
  const t = await getTranslations({ locale, namespace: "landing.modernHero" });
  const titlePart2MutedPrefix = t("titlePart2MutedPrefix");
  const titlePart2MutedSuffix = t("titlePart2MutedSuffix");
  const titlePart2Emphasis = t("titlePart2Emphasis");
  const heroTitleLine2UsesMuted =
    titlePart2MutedPrefix.trim().length > 0 ||
    titlePart2MutedSuffix.trim().length > 0;

  return (
    <section
      className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br ${HERO.gradient}`}
    >
      {/* Ambient mesh — brand glow, pointer-events none (no LCP impact) */}
      <div
        className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${BRAND_COLOR.DEFAULT} 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy - LCP CRITICAL PATH */}
          {/* Removed animate-fade-in to eliminate LCP delay */}
          <div className="text-center lg:text-left">
            {/* Badge - merke #0052FF */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 ${HERO.badge} text-sm font-semibold mb-6`}
            >
              {/* Inline SVG instead of lucide-react */}
              <svg
                className="w-4 h-4"
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
              {t("badge")}
            </div>

            {/* H1 - LCP ELEMENT: No animations, server-rendered, immediate paint */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              {t("titlePart1")}
              <br />
              {heroTitleLine2UsesMuted ? (
                <span className="inline-block">
                  <span className={HERO.titleMuted}>
                    {titlePart2MutedPrefix}
                  </span>
                  <span className={HERO.titleAccent}>{titlePart2Emphasis}</span>
                  <span className={HERO.titleMuted}>
                    {titlePart2MutedSuffix}
                  </span>
                </span>
              ) : (
                <span className={HERO.titleAccent}>{titlePart2Emphasis}</span>
              )}
            </h1>

            {/* H2 - Clearer value prop */}
            <p className="text-xl sm:text-2xl text-blue-50 mb-6 leading-relaxed">
              {t("subtitle")}
            </p>

            <p className="text-lg text-blue-100/90 mb-8 max-w-2xl mx-auto lg:mx-0">
              {t("bullets")}
            </p>

            <div className="mb-8">
              <HeroAudienceChips />
            </div>

            <HeroPrimaryActions locale={locale} />
          </div>

          {/* Right: Modern, honest mockup */}
          {/* Animation acceptable here - below fold on mobile, not LCP */}
          <div className="relative animate-fade-in-delayed">
            {/* Modern browser mockup */}
            <div className="relative rounded-2xl bg-white shadow-2xl shadow-[#0052FF]/15 ring-1 ring-white/20 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
              {/* Browser chrome */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-4 bg-slate-800 rounded px-3 py-1 min-w-0">
                  <span className="text-slate-400 text-xs font-mono truncate block">
                    {t("mockupUrl")}
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-linear-to-br from-slate-50 to-blue-50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-medium">
                      {t("mockupPaperLabel")}
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums tracking-tight">
                      {t("mockupBalance")}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <Check
                      className="w-3.5 h-3.5"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {t("mockupRiskFree")}
                  </div>
                </div>

                {/* Mini chart */}
                <div className="bg-white rounded-xl p-4 mb-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {t("mockupChartPair")}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {t("mockupChartTimeframe")}
                    </span>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full h-16" aria-hidden>
                    <defs>
                      <linearGradient
                        id="heroMockupChartFill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={BRAND_COLOR.DEFAULT}
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor={BRAND_COLOR.DEFAULT}
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12 L 200,60 L 0,60 Z"
                      fill="url(#heroMockupChartFill)"
                    />
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12"
                      fill="none"
                      stroke={BRAND_COLOR.DEFAULT}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Position cards */}
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        ₿
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          BTC/USDT
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {t("mockupBtcQty")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold text-green-600">
                        +12.4%
                      </div>
                      <div className="text-xs text-slate-500">+18 600 kr</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        Ξ
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          ETH/USDT
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {t("mockupEthQty")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold text-red-500">
                        -3.2%
                      </div>
                      <div className="text-xs text-slate-500">-4 800 kr</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge - merke #0052FF */}
              <div
                className="absolute -top-3 -right-3 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl max-w-[min(100%,220px)] text-center leading-tight"
                style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
              >
                {t("mockupFloatBadge")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
