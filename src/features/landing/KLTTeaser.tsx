'use client';

import { Coins } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/lib/design/tokens';

interface KLTTeaserProps {
  locale?: string;
}

export function KLTTeaser({ locale = 'no' }: KLTTeaserProps) {
  const coursePath = `/${locale}/kurs`;

  return (
    <section className="w-full border-t border-kp-border/50 bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Link
          href={coursePath}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-lg text-slate-300 hover:text-slate-200 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-kp-brand" />
            <span>Tjen KLT gjennom kurs og konkurranser</span>
          </div>
          <span className="hidden sm:inline text-slate-500">·</span>
          <span className={`${BRAND.link} font-medium animate-pulse`}>
            50 000 KLT til månedens vinner
          </span>
        </Link>
      </div>
    </section>
  );
}
