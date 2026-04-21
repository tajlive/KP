'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';

export default function SimpleLanding() {
  const t = useTranslations('landing');
  const baseT = useTranslations('base');
  const locale = useLocale();

  return (
    <main>
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="
        relative min-h-[100svh] flex flex-col items-center justify-center
        bg-slate-950 text-white
        px-4 sm:px-6 pt-24 pb-16
        overflow-hidden
      ">
        {/* Bakgrunns-glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="w-[min(600px,90vw)] h-[min(600px,90vw)] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Zap className="w-3.5 h-3.5" aria-hidden />
            Automatisk kryptohandel
          </div>

          {/* Heading — fluid type, aldri overflow */}
          <h1 className="
            text-[clamp(2rem,6vw+0.5rem,4rem)] font-black leading-[1.1] tracking-tight
            text-white
          ">
            {baseT('brand')}
          </h1>

          <p className="
            text-[clamp(1rem,2vw+0.5rem,1.25rem)] text-slate-300 max-w-xl mx-auto
            leading-relaxed
          ">
            {baseT('tagline')}
          </p>

          <p className="text-base text-slate-400 max-w-lg mx-auto">
            {t('heroDescription')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/${locale}/signup`}
              className="
                inline-flex items-center justify-center gap-2
                w-full sm:w-auto
                min-h-[48px] px-6 py-3
                bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                text-white font-bold text-base rounded-xl
                transition-colors
              "
            >
              {t('heroButton')}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href={`#backtest`}
              className="
                inline-flex items-center justify-center gap-2
                w-full sm:w-auto
                min-h-[48px] px-6 py-3
                bg-white/5 hover:bg-white/10 active:bg-white/15
                text-white font-semibold text-base rounded-xl
                border border-white/10
                transition-colors
              "
            >
              Se historisk avkastning
            </Link>
          </div>
        </div>

        {/* Scroll-hint */}
        <div
          aria-hidden
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 text-xs"
        >
          <span>Scroll</span>
          <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ─── Feature-pills ───────────────────────────────────────────── */}
      <section className="bg-slate-900 border-t border-white/5 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <TrendingUp className="w-5 h-5 text-blue-400" aria-hidden />,
                title: 'Automatisert handel',
                desc: 'Boten handler for deg 24/7',
              },
              {
                icon: <Shield className="w-5 h-5 text-green-400" aria-hidden />,
                title: 'Risikostyring',
                desc: 'Stop-loss og maks dagstap',
              },
              {
                icon: <Zap className="w-5 h-5 text-yellow-400" aria-hidden />,
                title: 'Klar på 5 minutter',
                desc: 'Koble til Coinbase og start',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
