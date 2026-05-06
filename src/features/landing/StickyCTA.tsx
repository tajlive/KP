/**
 * StickyCTA — Fixed CTA button at bottom on mobile
 * Design: 100% width, thumb-friendly height (48px)
 * Hidden on tablet+ (md:hidden)
 */

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

export async function StickyCTA() {
  const t = await getTranslations('landing.stickyCTA');

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 shadow-2xl shadow-black/5 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 w-full">
        <Link
          href="/velkommen"
          className="flex items-center justify-center gap-2 w-full h-12 bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold rounded-lg transition-all duration-200 active:scale-95 text-sm sm:text-base"
        >
          {t('label')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
