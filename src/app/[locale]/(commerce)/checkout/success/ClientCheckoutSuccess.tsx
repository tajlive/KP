'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/error';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/design/tokens';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'no';
  const _supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [_verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  const sessionId = searchParams?.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('Manglende session ID');
      setLoading(false);
      return;
    }

    verifyPayment();
  }, [sessionId]);

  async function verifyPayment() {
    try {
      // Verify with backend
      const response = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Kunne ikke verifisere betalingen');
      }

      const data = await response.json();
      
      if (data.verified) {
        setVerified(true);
        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          router.push(`/${locale}/dashboard`, { scroll: false });
        }, 5000);
      } else {
        throw new Error('Betaling ikke bekreftet');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Bekrefter betalingen...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-4">
            Noe Gikk Galt
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/${locale}/support`)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
          >
            Kontakt Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-green-200 dark:border-green-800 p-8 md:p-12 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
          <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
          🎉 Velkommen til Klarpakke!
        </h1>

        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Din betaling er bekreftet. Du har nå full tilgang til kurset ditt!
        </p>

        {/* What&apos;s Next */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Hva skjer nå?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                1
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Sjekk e-posten din
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Vi har sendt deg en velkomst-e-post med innloggingsinfo
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                2
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Start første leksjon
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gå til dashboard og start din trading-reise
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Bli med i WhatsApp-gruppen
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Koble til med andre studenter (link i dashboardet)
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/${locale}/dashboard`, { scroll: false })}
          className={`w-full sm:w-auto px-8 py-4 ${BRAND.gradient} hover:opacity-90 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2 mx-auto`}
        >
          Gå Til Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          Automatisk omdirigering om 5 sekunder...
        </p>

        {/* Tom&apos;s message */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 italic">
            &ldquo;Gratulerer med kjøpet! Jeg er spent på å følge din framgang. 
            Hvis du har spørsmål, er jeg bare en melding unna.&rdquo;
          </p>
          <p className="text-gray-900 dark:text-white font-semibold mt-2">
            — Tom Jensen
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClientCheckoutSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
