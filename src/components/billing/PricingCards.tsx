'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, CreditCard, X } from 'lucide-react';
import { STRIPE_PLANS, type PlanType } from '@/lib/stripe';
import { trackCheckoutStarted } from '@/lib/analytics';

interface PricingCardsProps {
  currentPlan?: PlanType | null;
  onSelectPlan?: (plan: PlanType, priceId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PricingCards({ currentPlan, onSelectPlan }: PricingCardsProps) {
  const [isLoading, setIsLoading] = useState<PlanType | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: PlanType, priceId?: string) => {
    if (!priceId) return;
    
    setIsLoading(planKey);
    setError(null);
    
    trackCheckoutStarted(planKey, priceId);

    try {
      if (onSelectPlan) {
        onSelectPlan(planKey, priceId);
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          mode: 'subscription',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke starte betalingen');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.';
      setError(message);
    } finally {
      setIsLoading(null);
    }
  };

  const plans = Object.entries(STRIPE_PLANS) as [PlanType, typeof STRIPE_PLANS.basis][];

  return (
    <div className="w-full">
      {/* Toggle måned/år */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isAnnual ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            Månedlig
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAnnual ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
            }`}
          >
            Årlig <span className="text-green-400 text-xs">-20%</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
        >
          <X size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Betalingen kunne ikke startes</p>
            <p className="text-red-400/70">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Pricing cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {plans.map(([key, plan]) => {
          const isCurrent = currentPlan === key;
          const price = isAnnual ? plan.priceAnnual : plan.price;
          const priceId = isAnnual ? plan.priceAnnualId : plan.priceId;
          const isFree = key === 'free';

          return (
            <motion.div
              key={key}
              variants={cardVariants}
              className={`relative p-5 rounded-2xl border transition-all ${
                isCurrent
                  ? 'border-[#2563eb] bg-[#2563eb]/5'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              } ${plan.popular ? 'lg:scale-105 lg:-my-2' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#2563eb] rounded-full text-xs font-medium text-white">
                  Mest populær
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-white/50">{plan.description}</p>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  {isFree ? 'Gratis' : `${price} kr`}
                </span>
                {!isFree && (
                  <span className="text-white/40 text-sm">/{isAnnual ? 'år' : 'mnd'}</span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                    <Check size={14} className="mt-0.5 text-green-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {(plan as { limitations?: readonly string[] }).limitations?.map((limitation: string) => (
                  <li key={limitation} className="flex items-start gap-2 text-sm text-white/40">
                    <X size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(key, priceId)}
                disabled={isCurrent || isLoading === key || (!isFree && !priceId)}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  isCurrent
                    ? 'bg-white/10 text-white/50 cursor-default'
                    : isFree
                    ? 'bg-white/[0.06] text-white hover:bg-white/10'
                    : 'bg-[#2563eb] text-white hover:bg-[#2563eb]/90'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === key ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Laster...
                  </span>
                ) : isCurrent ? (
                  'Din plan'
                ) : isFree ? (
                  'Start gratis'
                ) : (
                  'Velg plan'
                )}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Trust indicators */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/40">
        <div className="flex items-center gap-2">
          <Shield size={14} />
          <span>Betalingen håndteres trygt via Stripe</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard size={14} />
          <span>Du kan avslutte når som helst</span>
        </div>
        <div className="flex items-center gap-2">
          <Check size={14} />
          <span>Norsk mva-/kvitteringsvennlig flyt</span>
        </div>
      </div>
    </div>
  );
}
