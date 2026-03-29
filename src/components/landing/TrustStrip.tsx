/**
 * TrustStrip — Trust badges immediately under hero
 * Design: Coinbase-inspired trust signals
 * Layout: Mobile-responsive grid
 * 
 * NOTE: Konvertert til Server Component (Script 03 - Performance)
 * Bruker getTranslations fra next-intl/server
 */

import { getTranslations } from 'next-intl/server';

interface TrustStripProps {
  locale?: string;
}

export async function TrustStrip({ locale = 'no' }: TrustStripProps) {
  const t = await getTranslations({ locale, namespace: 'landing.trustStrip' });

  return (
    <section 
      data-testid="trust-strip"
      className="w-full bg-white border-b border-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950 dark:border-slate-800"
    >
      <div className="max-w-6xl mx-auto">
        {/* STATS ROW — 2 cols on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Stat 1: Paper Trading Capital */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1 dark:text-slate-400">
              {t('label1')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              kr 100K
            </div>
            <div className="text-xs text-slate-500 mt-1 dark:text-slate-500">{t('description1')}</div>
          </div>

          {/* Stat 2: Risk-Free Practice */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1 dark:text-slate-400">
              {t('label2')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-500">
              0 kr
            </div>
            <div className="text-xs text-slate-500 mt-1 dark:text-slate-500">{t('description2')}</div>
          </div>

          {/* Stat 3: Auto-Trading */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1 dark:text-slate-400">
              {t('label3')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              24/7
            </div>
            <div className="text-xs text-slate-500 mt-1 dark:text-slate-500">{t('description3')}</div>
          </div>

          {/* Stat 4: Education Focus */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1 dark:text-slate-400">
              {t('label4')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-brand-500 dark:text-brand-400">
              100%
            </div>
            <div className="text-xs text-slate-500 mt-1 dark:text-slate-500">{t('description4')}</div>
          </div>
        </div>

        {/* PAYMENT LOGOS */}
        <div className="border-t border-slate-100 pt-8 sm:pt-12 dark:border-slate-800">
          <div className="text-xs text-slate-600 font-medium text-center mb-4 dark:text-slate-400">
            {t('paymentLabel')}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {/* Vipps */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Vipps</span>
            </div>

            {/* Apple Pay */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apple Pay</span>
            </div>

            {/* Stripe */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stripe</span>
            </div>

            {/* PayPal */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PayPal</span>
            </div>

            {/* TrustPilot */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">TrustPilot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
