'use client';

import { Sparkles, Clock } from 'lucide-react';
import { BRAND } from '@/lib/design/tokens';

interface ReverseTrialProps {
  trialEndsAt: string | null;
  tier: string;
  locale: string;
}

export default function ReverseTrial({ trialEndsAt, tier, locale }: ReverseTrialProps) {
  if (tier !== 'student' || trialEndsAt === null) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
  const no = locale === 'no';

  if (daysLeft > 0) {
    return (
      <div className="flex items-center justify-between bg-gradient-to-r from-[#0052FF]/5 to-[#0052FF]/10 border border-[#0052FF]/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0052FF] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1D26]">
              {no ? 'Bachelor-prøveperiode' : 'Bachelor trial'}
            </p>
            <p className="text-xs text-[#5E6478]">
              {no ? `${daysLeft} dager igjen` : `${daysLeft} days remaining`}
            </p>
          </div>
        </div>
        <a
          href={`/${locale}/priser`}
          className={`${BRAND.primary} text-sm font-medium rounded-lg px-4 py-2 transition-colors`}
        >
          {no ? 'Oppgrader nå' : 'Upgrade now'}
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1D26]">
            {no ? 'Prøveperioden er over' : 'Trial period ended'}
          </p>
          <p className="text-xs text-[#5E6478]">
            {no ? 'Oppgrader for å beholde Bachelor-funksjoner' : 'Upgrade to keep Bachelor features'}
          </p>
        </div>
      </div>
      <a
        href={`/${locale}/priser`}
        className={`${BRAND.primary} text-sm font-medium rounded-lg px-4 py-2 transition-colors`}
      >
        {no ? 'Se priser' : 'See prices'}
      </a>
    </div>
  );
}
