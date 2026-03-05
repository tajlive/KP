'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/utils';

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const t = useTranslations('pricing.success');
  const locale = useLocale();
  const [message, setMessage] = useState(t('verifying'));

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setStatus('error');
        setMessage(t('invalidSession'));
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setStatus('error');
          setMessage(t('loginRequired'));
          return;
        }

        // Vent litt for å la webhooken behandle (den kjører asynkront)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sjekk at abonnementet ble oppdatert
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (profile?.subscription_status === 'active' || profile?.subscription_tier !== 'free') {
          setStatus('success');
          setMessage(t('messageConfirmed'));
        } else {
          // Webhooken kan være litt treig, vis suksess uansett
          setStatus('success');
          setMessage(t('messagePending'));
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        setStatus('success'); // Vis suksess uansett, webhooken har nok kjørt
        setMessage(t('messageFallback'));
      }
    };

    verifySession();
  }, [sessionId, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">{t('loadingTitle')}</h1>
            <p className="text-slate-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-slate-400 mb-8">{message}</p>

            <div className="space-y-3">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href={`/${locale}/dashboard`}>{t('goToDashboard')}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}`}>{t('backToHome')}</Link>
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{t('errorTitle')}</h1>
            <p className="text-slate-400 mb-8">{message}</p>

            <Button asChild variant="outline" className="w-full">
              <Link href={`/${locale}/priser`}>{t('backToPricing')}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
