import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles, BarChart3, MessageSquare } from 'lucide-react';
import { SURFACE, RADIUS, BRAND, CARD } from '@/lib/design/tokens';

type Props = { locale: string };

export default async function LandingAITools({ locale }: Props) {
  const t = await getTranslations('landing.aiTools');

  return (
    <section className={`py-16 md:py-24 ${SURFACE.BG_LIGHT} border-t border-slate-200`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052FF]/10 text-[#0052FF] rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" aria-hidden />
            {t('badge')}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={`${CARD.hover} flex flex-col`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#0052FF]" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {t('marketBrief.title')}
              </h3>
            </div>
            <p className="text-slate-600 mb-6 flex-1">
              {t('marketBrief.description')}
            </p>
            <Link
              href={`/${locale}/dashboard`}
              className={`inline-flex items-center justify-center gap-2 ${BRAND.primary} ${RADIUS.button} px-5 py-2.5 font-semibold text-sm w-fit`}
            >
              {t('marketBrief.cta')}
            </Link>
          </div>

          <div className={`${CARD.hover} flex flex-col`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#0052FF]" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {t('strategyAdvisor.title')}
              </h3>
            </div>
            <p className="text-slate-600 mb-6 flex-1">
              {t('strategyAdvisor.description')}
            </p>
            <Link
              href={`/${locale}/dashboard`}
              className={`inline-flex items-center justify-center gap-2 ${BRAND.primaryOutline} ${RADIUS.button} px-5 py-2.5 font-semibold text-sm w-fit`}
            >
              {t('strategyAdvisor.cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
