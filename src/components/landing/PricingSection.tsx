'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { CheckCircle, Star, Sparkles, Zap, Target, Crown } from 'lucide-react';
import { TIERS } from '@/lib/pricing/tiers';

// Map tier slugs to icons
const tierIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  student: Star,
  bachelor: Sparkles,
  master: Zap,
  phd: Target,
  professor: Crown,
};

// Bruk samme TIERS-data som /no/priser - vis alle 5 planer
const getDisplayPlans = () => {
  return Object.entries(TIERS).map(([slug, tier]) => ({
    id: slug,
    name: tier.slug.charAt(0).toUpperCase() + tier.slug.slice(1), // Student, Bachelor, Master, PhD, Professor
    badge: tier.badge,
    price: tier.priceNOK,
    period: '/mnd',
    popular: tier.popular,
    icon: tierIcons[slug],
    features: tier.features.slice(0, 5),
    cta: tier.priceNOK === 0 ? 'Start gratis' : 'Velg plan',
    courseId: slug,
  }));
};

export default function PricingSection() {
  const router = useRouter();
  const locale = useLocale();
  const plans = getDisplayPlans();

  return (
    <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Velg Din Plan
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            Alle planer inkluderer 14 dagers prøveperiode. Ingen binding.
          </p>
        </div>

        {/* Plans - 5 kolonner på desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
          {plans.map((plan) => {
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  plan.popular
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 shadow-xl scale-105 z-10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wide shadow-sm">
                    Mest populær
                  </div>
                )}

                {/* Icon & Badge */}
                <div className="mb-4">
                  <div className="text-3xl mb-2">{plan.badge}</div>
                  <div className="w-10 h-10">
                    <Icon className={`w-full h-full ${
                      plan.popular ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${
                      plan.popular
                        ? 'text-blue-600 dark:text-blue-500'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {plan.price === 0 ? 'Gratis' : plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-gray-500">kr/mnd</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'text-blue-600' : 'text-green-500'
                      }`} />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => router.push(`/${locale}/priser`)}
                  className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* KLT Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            <span className="font-semibold">KLT tokens</span> er Klarpakkes belønningsvaluta — 
            bruk dem til å låse opp eksklusivt innhold og fordeler. 
            Du får KLT tokens ved registrering og månedlig med alle betalte planer.
          </p>
        </div>

        {/* Sikker betaling */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Sikker betaling med Stripe. Prisene er i norske kroner og inkluderer MVA.
          </p>
        </div>
      </div>
    </section>
  );
}
