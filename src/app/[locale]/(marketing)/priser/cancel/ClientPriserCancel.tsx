'use client';

import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function ClientPriserCancel() {
  const locale = useLocale();
  const t = useTranslations('pricing.cancel');

  return (
    <div className="w-full max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-8">
          <XCircle className="w-12 h-12 text-gray-400" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          {t('title')}
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          {t('subtitle')}
        </p>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">{t('faqTitle')}</h2>
          </div>
          <div className="space-y-4 text-gray-300">
            <div>
              <p className="font-medium text-white mb-1">{t('whyFailedQ')}</p>
              <p className="text-sm">{t('whyFailedA')}</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">{t('chargedQ')}</p>
              <p className="text-sm">{t('chargedA')}</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">{t('trialQ')}</p>
              <p className="text-sm">{t('trialA')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${locale}/priser`}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('tryAgain')}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold transition-all"
          >
            {t('backHome')}
          </Link>
        </div>

        <p className="mt-8 text-gray-400 text-sm">
          {t('needHelp')}{' '}
          <a href="mailto:tom@klarpakke.no" className="text-blue-400 hover:text-blue-300">
            tom@klarpakke.no
          </a>
        </p>
    </div>
  );
}
