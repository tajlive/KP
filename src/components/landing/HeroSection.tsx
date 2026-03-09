import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * HeroSection - Server Component (no "use client")
 * 
 * KEY OPTIMIZATIONS from previous version:
 * - No "use client" directive - renders on server
 * - No framer-motion - uses CSS transitions only
 * - No useRouter - uses native Link component
 * - No lucide-react icons - uses inline SVG
 * - No animated scroll indicator
 * 
 * This eliminates ~30KB+ JS from the critical path
 * and removes hydration blocking for LCP.
 */

export default async function HeroSection() {
  // Server-side translation
  const t = await getTranslations("landing.modernHero");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-700">
      {/* Modern grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left animate-fade-in">
            {/* Modern badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm text-white border border-blue-400/30 rounded-full text-sm font-semibold mb-6">
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

            {/* H1 - More compelling */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              {t("titlePart1")}
              <br />
              <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                {t("titlePart2")}
              </span>
            </h1>

            {/* H2 - Clearer value prop */}
            <p className="text-xl sm:text-2xl text-blue-50 mb-6 leading-relaxed">
              {t("subtitle")}
            </p>

            <p className="text-lg text-blue-100/90 mb-10 max-w-2xl">
              {t("bullets")}
            </p>

            {/* Modern CTAs - Using Link instead of button + router */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/paper-trading"
                aria-label={t("ctaPrimary")}
                className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                {t("ctaPrimary")}
                {/* Inline SVG ArrowRight */}
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/kurs"
                aria-label={t("ctaSecondary")}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border-2 border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                {t("ctaSecondary")}
              </Link>
            </div>

            {/* Trust indicators - modernized */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                {/* Inline SVG CheckCircle */}
                <svg
                  className="w-5 h-5 text-green-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                <span>{t("trust1")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                <span>{t("trust2")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                <span>{t("trust3")}</span>
              </div>
            </div>
          </div>

          {/* Right: Modern, honest mockup */}
          <div className="relative animate-fade-in-delayed">
            {/* Modern browser mockup */}
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
              {/* Browser chrome */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-4 bg-slate-800 rounded px-3 py-1">
                  <span className="text-slate-400 text-xs font-mono">
                    klarpakke.no/paper-trading
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">
                      Paper Trading
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      1 000 000 kr
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    ✓ Risikofritt
                  </div>
                </div>

                {/* Mini chart */}
                <div className="bg-white rounded-xl p-4 mb-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      BTC/USDT
                    </span>
                    <span className="text-xs text-slate-500">Siste 24t</span>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full h-16">
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="#3b82f6"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                    </defs>
                    {/* Area under line */}
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12 L 200,60 L 0,60 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Line */}
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12"
                      fill="none"
                      stroke="#3b82f6"
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        ₿
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          BTC/USDT
                        </div>
                        <div className="text-xs text-slate-500">0.025 BTC</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        +12.4%
                      </div>
                      <div className="text-xs text-slate-500">+18 600 kr</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        Ξ
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          ETH/USDT
                        </div>
                        <div className="text-xs text-slate-500">0.5 ETH</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-500">
                        -3.2%
                      </div>
                      <div className="text-xs text-slate-500">-4 800 kr</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl">
                1M kr virtuelt 🎯
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
