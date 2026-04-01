'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error with digest for debugging
    console.error('Admin Error - Digest:', (error as Error & { digest?: string }).digest);
    console.error('[Admin] Error:', error);
    
    // Send to Sentry with extra context
    Sentry.captureException(error, {
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
        <h2 className="text-2xl font-bold text-white mb-2">Admin-feil</h2>
        <p className="text-slate-400 mb-2">{error.message || 'En uventet feil oppstod'}</p>
        {error.digest && (
          <p className="text-xs text-slate-500 font-mono mb-4">
            Feilkode: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
          Prøv igjen
        </Button>
      </div>
    </div>
  );
}
