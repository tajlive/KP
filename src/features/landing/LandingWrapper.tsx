'use client';

import { Suspense } from 'react';
import SimpleLanding from './SimpleLanding';
import LandingFAQ from './LandingFAQ';
import { LandingBacktestTeaser } from './LandingBacktestTeaser';
import { LandingNavigation } from './LandingNavigation';

function SectionSkeleton() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 mx-auto" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto" />
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function LandingWrapper() {
  return (
    <>
      <LandingNavigation />
      {/* Hero */}
      <SimpleLanding />

      {/* Backtest-kalkulator */}
      <Suspense fallback={<SectionSkeleton />}>
        <LandingBacktestTeaser />
      </Suspense>

      {/* FAQ */}
      <Suspense fallback={<SectionSkeleton />}>
        <LandingFAQ />
      </Suspense>
    </>
  );
}
