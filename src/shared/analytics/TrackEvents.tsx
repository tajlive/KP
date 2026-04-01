'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  trackOnboardingViewed, 
  trackPricingViewed, 
  trackDashboardViewed 
} from '@/lib/analytics';

export function TrackPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const normalizedPath = pathname.toLowerCase();

    if (normalizedPath.includes('onboard')) {
      trackOnboardingViewed();
    } else if (normalizedPath.includes('pris') || normalizedPath.includes('pricing')) {
      trackPricingViewed();
    } else if (normalizedPath.includes('dashboard')) {
      trackDashboardViewed();
    }
  }, [pathname]);

  return null;
}

interface TrackOnboardingStepProps {
  step: 1 | 2 | 3;
}

export function TrackOnboardingStep({ step }: TrackOnboardingStepProps) {
  useEffect(() => {
    if (step === 1) {
      import('@/lib/analytics').then(({ trackOnboardingStep1Completed }) => {
        trackOnboardingStep1Completed();
      });
    } else if (step === 2) {
      import('@/lib/analytics').then(({ trackOnboardingStep2Completed }) => {
        trackOnboardingStep2Completed();
      });
    }
  }, [step]);

  return null;
}
