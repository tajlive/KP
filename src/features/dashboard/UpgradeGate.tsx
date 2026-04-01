'use client';

import { Lock } from 'lucide-react';
import { BRAND } from '@/lib/design/tokens';
import type { ReactNode } from 'react';

interface UpgradeGateProps {
  feature: string;
  requiredTier: string;
  currentTier: string;
  locale: string;
  children: ReactNode;
}

const TIER_LEVELS: Record<string, number> = {
  student: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
};

export function UpgradeGate({
  feature,
  requiredTier,
  currentTier,
  locale,
  children,
}: UpgradeGateProps) {
  const currentLevel = TIER_LEVELS[currentTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requiredTier] ?? 0;

  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  const no = locale === 'no';

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#E2E5EC] shadow-lg p-6 text-center max-w-sm mx-4">
          <Lock className="w-8 h-8 text-[#8E95A9] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1A1D26] mb-1">
            {no ? `Krever ${requiredTier}-plan` : `Requires ${requiredTier} plan`}
          </p>
          <p className="text-xs text-[#5E6478] mb-3">{feature}</p>
          <a
            href={`/${locale}/priser`}
            className={`${BRAND.primary} text-sm font-medium rounded-lg px-4 py-2 inline-block transition-colors`}
          >
            {no ? 'Se priser' : 'See prices'}
          </a>
        </div>
      </div>
    </div>
  );
}
