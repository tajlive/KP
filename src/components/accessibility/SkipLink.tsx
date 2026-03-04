'use client';

import Link from 'next/link';

interface SkipLinkProps {
  locale?: string;
}

export function SkipLink({ locale = 'no' }: SkipLinkProps) {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] 
                 focus:bg-yellow-500 focus:text-slate-950 focus:px-6 focus:py-3 
                 focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg
                 focus:outline-none focus:ring-4 focus:ring-yellow-500/30"
    >
      {locale === 'no' ? 'Hopp til hovedinnhold' : 'Skip to main content'}
    </Link>
  );
}
