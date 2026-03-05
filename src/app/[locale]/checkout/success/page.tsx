import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TierSlug, TIERS } from '@/lib/pricing/tiers';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tier?: string; provider?: string }>;
}) {
  const { locale }         = await params;
  const { tier, provider: _provider } = await searchParams;
  const t                  = await getTranslations({ locale, namespace: 'studieprogram' });
  const tPricing           = await getTranslations({ locale, namespace: 'pricing' });
  const tierSlug           = (tier as TierSlug) ?? 'student';
  const tierData           = TIERS[tierSlug] ?? TIERS.student;
  const tierName           = t(`tiers.${tierSlug}.name`);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-900 rounded-3xl p-10 text-center border border-slate-800">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>
        <div className="text-5xl mb-4">{tierData.badge}</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {tPricing('success.title')}
        </h1>
        <p className="text-slate-400 mb-8">
          {tPricing('success.description', { tier: tierName })}
        </p>
        {tierData.kltMonthly > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
            <p className="text-yellow-300 font-semibold">
              🪙 {tierData.kltMonthly.toLocaleString()} KLT tokens/mnd aktivert
            </p>
          </div>
        )}
        {tierData.kltSignup > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
            <p className="text-yellow-300 font-semibold">
              🪙 {tierData.kltSignup.toLocaleString()} KLT tokens mottatt
            </p>
          </div>
        )}
        <p className="text-xs text-slate-600 mb-8 uppercase tracking-wider">
          Betalt via Stripe
        </p>
        <div className="flex flex-col gap-3">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl" asChild>
            <Link href={`/${locale}/dashboard`}>
              {tPricing('success.cta')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl border-slate-700 text-slate-300" asChild>
            <Link href={`/${locale}/studieprogram`}>
              {tPricing('success.viewProgram')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
