'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🛡️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin-feil</h2>
        <p className="text-slate-400 mb-6">{error.message || 'En uventet feil oppstod'}</p>
        <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
          Prøv igjen
        </Button>
      </div>
    </div>
  );
}
