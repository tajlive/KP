'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function SimpleLanding() {
  const t = useTranslations('landing');
  const baseT = useTranslations('base');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-4xl font-bold text-blue-500 mb-4">{baseT('brand')}</h1>
      <p className="text-xl text-slate-300">{baseT('tagline')}</p>
      <p className="mt-4 text-slate-400">{t('heroDescription')}</p>
      <Link 
        href={`/${locale}/beta/apply`}
        className="inline-block mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
      >
        {t('heroButton')} →
      </Link>
    </div>
  );
}
