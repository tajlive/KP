import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import SuccessContent from './SuccessContent';

function LoadingFallback() {
  const t = useTranslations('pricing.success');
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400">{t('loadingMessage')}</p>
    </div>
  );
}

export default function ClientPriserSuccess() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
