'use client';

import { useEffect, useState } from 'react';

export type Variant = 'control' | 'variant-a';

export interface ABTest {
  name: string;
  variant: Variant;
  timestamp: number;
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Simple A/B testing implementation
 * - 50/50 split between control and variant
 * - Persists user's variant in localStorage
 */
export function useABTest(testName: string): Variant {
  const [variant, setVariant] = useState<Variant>('control');

  useEffect(() => {
    // Check if user already has a variant assigned
    const stored = localStorage.getItem(`ab_test_${testName}`);
    
    if (stored) {
      const test: ABTest = JSON.parse(stored);
      setVariant(test.variant);
    } else {
      // Randomly assign variant (50/50)
      const newVariant: Variant = Math.random() < 0.5 ? 'control' : 'variant-a';
      
      const test: ABTest = {
        name: testName,
        variant: newVariant,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(`ab_test_${testName}`, JSON.stringify(test));
      setVariant(newVariant);
    }
  }, [testName]);

  return variant;
}

/**
 * Track A/B test conversion (e.g., signup, start trading)
 */
export function trackConversion(testName: string, conversionType: string) {
  const stored = localStorage.getItem(`ab_test_${testName}`);
  
  if (!stored) return;
  
  const test: ABTest = JSON.parse(stored);
  
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_conversion', {
      test_name: testName,
      variant: test.variant,
      conversion_type: conversionType,
    });
  }
}

/**
 * Track A/B test impression (page view)
 */
export function trackImpression(testName: string) {
  const stored = localStorage.getItem(`ab_test_${testName}`);
  
  if (!stored) return;
  
  const test: ABTest = JSON.parse(stored);
  
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_impression', {
      test_name: testName,
      variant: test.variant,
    });
  }
}
