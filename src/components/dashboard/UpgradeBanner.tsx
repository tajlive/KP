'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { TierSlug } from '@/lib/pricing/tiers';

interface UpgradeBannerProps {
  tierSlug: TierSlug;
  locale: string;
}

export function UpgradeBanner({ tierSlug, locale }: UpgradeBannerProps) {
  if (tierSlug === 'student') {
    return (
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <AlertTitle className="text-blue-900 font-bold text-lg">
            Oppgrader til Bachelor — Lås opp Krypto-Professor
          </AlertTitle>
          <AlertDescription className="text-blue-700 mt-2">
            <p className="mb-3">
              Du bruker <strong>Student (gratis)</strong>. Oppgrader til Bachelor for 249 kr/mnd og få:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-4">
              <li>Krypto-Professor — stille spørsmål når som helst</li>
              <li>Teknisk Analyse Masterclass</li>
              <li>Ukentlige Live-Webinarer</li>
              <li>1 000 KLT tokens/mnd</li>
            </ul>
            <Button 
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Link href={`/${locale}/priser`}>
                Se alle abonnement
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  if (tierSlug === 'bachelor') {
    return (
      <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 mb-6">
        <Zap className="h-5 w-5 text-yellow-600" />
        <div className="flex-1">
          <AlertTitle className="text-yellow-900 font-bold text-lg">
            Oppgrader til Master — Lås opp Live Trading
          </AlertTitle>
          <AlertDescription className="text-yellow-800 mt-2">
            <p className="mb-3">
              Du bruker <strong>Bachelor</strong>. Oppgrader til Master for 499 kr/mnd og få:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-4">
              <li><strong>Live Trading på Binance</strong> — handel med ekte crypto</li>
              <li>Automatisk Trading (3 strategier)</li>
              <li>Kopiering av topp-tradere</li>
              <li>Bachelor-sertifikat ved bestått eksamen</li>
              <li>2 500 KLT tokens/mnd</li>
            </ul>
            <Button 
              asChild
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Link href={`/${locale}/priser`}>
                Oppgrader til Master
                <Crown className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return null;
}
