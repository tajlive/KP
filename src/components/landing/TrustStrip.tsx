'use client';

/**
 * TrustStrip — Trust badges immediately under hero
 * Design: Coinbase-inspired trust signals
 * Layout: Mobile-responsive grid
 */

import { useTranslations } from 'next-intl';

export function TrustStrip() {
  const t = useTranslations('landing.trustStrip');

  return (
    <section className="w-full bg-white border-b border-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* STATS ROW — 2 cols on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Stat 1: Users */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {t('label1')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              500K+
            </div>
            <div className="text-xs text-slate-500 mt-1">{t('description1')}</div>
          </div>

          {/* Stat 2: TrustPilot */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              ⭐ {t('label2')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-500">
              4.9/5
            </div>
            <div className="text-xs text-slate-500 mt-1">1,234 reviews</div>
          </div>

          {/* Stat 3: Paper Capital */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {t('label3')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-green-600">
              kr 100K
            </div>
            <div className="text-xs text-slate-500 mt-1">{t('description3')}</div>
          </div>

          {/* Stat 4: Auto-Trading */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {t('label4')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600">
              24/7
            </div>
            <div className="text-xs text-slate-500 mt-1">{t('description4')}</div>
          </div>
        </div>

        {/* PAYMENT LOGOS */}
        <div className="border-t border-slate-100 pt-8 sm:pt-12">
          <div className="text-xs text-slate-600 font-medium text-center mb-4">
            {t('paymentLabel')}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {/* Vipps */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Vipps</span>
            </div>

            {/* Apple Pay */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Apple Pay</span>
            </div>

            {/* Stripe */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Stripe</span>
            </div>

            {/* PayPal */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">PayPal</span>
            </div>

            {/* TrustPilot */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">TrustPilot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
