'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { captureException } from '@/lib/sentry';
import { useTranslations } from 'next-intl';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('admin');
  
  useEffect(() => {
    // Log error with digest for debugging
    console.error('Admin Error - Digest:', (error as Error & { digest?: string }).digest);
    console.error('[Admin] Error:', error);
    
    // Send to GlitchTip with extra context
    captureException(error, {
      extra: {
        digest: (error as Error & { digest?: string }).digest,
        errorName: error.name,
        errorMessage: error.message,
      },
      tags: {
        errorBoundary: 'admin-error',
        section: 'admin',
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🛡️</div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('adminError')}</h2>
        <p className="text-slate-400 mb-2">{error.message || t('unexpectedError')}</p>
        {error.digest && (
          <p className="text-xs text-slate-500 font-mono mb-4">
            {t('errorCode')}: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
