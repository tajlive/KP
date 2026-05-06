import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import SuccessContent from './SuccessContent';

export default async function ClientPriserSuccess() {
  const t = await getTranslations('pricing.success');

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t('loadingMessage')}</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
