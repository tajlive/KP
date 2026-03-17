'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { SURFACE, RADIUS, BRAND } from '@/lib/design/tokens';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export default function LandingFAQ() {
  const t = useTranslations('landing.faq');
  const locale = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24 border-t border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_KEYS.map((key, idx) => (
            <div
              key={key}
              className={`${SURFACE.BG_LIGHT} ${RADIUS.card} border border-slate-200 overflow-hidden transition-shadow hover:shadow-md`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
                aria-expanded={openIndex === idx}
              >
                <span className="font-semibold text-slate-900 pr-4">
                  {t(`${key}.question`)}
                </span>
                <span
                  className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-transform duration-200 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              {openIndex === idx && (
                <div className="px-5 pb-4 pt-0 border-t border-slate-200">
                  <p className="text-slate-600 leading-relaxed pt-3">
                    {t(`${key}.answer`)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-slate-600 mb-4">
          {t('contactText')}
        </p>
        <div className="text-center">
          <Link
            href={`/${locale}/kontakt`}
            className={`inline-flex items-center justify-center gap-2 ${BRAND.primary} ${RADIUS.button} px-6 py-3 font-semibold`}
          >
            {t('contactCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
