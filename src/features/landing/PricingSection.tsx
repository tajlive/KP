"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  CheckCircle,
  GraduationCap,
  TrendingUp,
  Award,
  Target,
  Crown,
  Trophy,
} from "lucide-react";
import { useVippsMarket } from "@/shared/providers/VippsMarketProvider";
import { TIERS } from "@/lib/pricing/tiers";
import {
  BRAND,
  BRAND_COLOR,
  SURFACE,
  RADIUS,
  SHADOW,
  CARD,
} from "@/lib/design/tokens";

// Samme ikoner og farger som /priser
const tierIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  student: GraduationCap,
  bachelor: TrendingUp,
  master: Award,
  phd: Target,
  professor: Crown,
};
const tierIconColors: { [key: string]: string } = {
  student: "text-slate-400",
  bachelor: "text-blue-400",
  master: "text-emerald-400",
  phd: "text-indigo-400",
  professor: "text-amber-400",
};

// Bruk samme TIERS-data som /no/priser - vis alle 5 planer
const getDisplayPlans = () => {
  return Object.entries(TIERS).map(([slug, tier]) => ({
    id: slug,
    name: tier.slug.charAt(0).toUpperCase() + tier.slug.slice(1), // Student, Bachelor, Master, PhD, Professor
    badge: tier.badge,
    price: tier.priceNOK,
    period: "/mnd",
    popular: tier.popular,
    icon: tierIcons[slug],
    features: tier.features.slice(0, 5),
    cta: tier.priceNOK === 0 ? "Start gratis" : "Velg plan",
    courseId: slug,
  }));
};

interface PricingSectionProps {
  title?: string;
  subtitle?: string;
}

export default function PricingSection({ title, subtitle }: PricingSectionProps) {
  const router = useRouter();
  const locale = useLocale();
  const { showVipps } = useVippsMarket();
  const plans = getDisplayPlans();

  return (
    <section id="pricing" className={`py-20 ${SURFACE.BG}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2
            className={`text-4xl sm:text-5xl font-black ${SURFACE.TEXT} mb-4`}
          >
            {title ?? "Velg Din Plan"}
          </h2>
          <p className={`text-xl ${SURFACE.TEXT_MUTED} mb-6`}>
            {subtitle ?? "Alle planer inkluderer 14 dagers prøveperiode. Ingen binding."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const iconColor = tierIconColors[plan.id] ?? "text-slate-400";

            return (
              <div
                key={plan.id}
                className={`relative ${RADIUS.card} border-2 p-6 transition-all ${
                  plan.popular
                    ? `dark:bg-slate-900/90 ${SHADOW.cardBrand} scale-105 z-10`
                    : `${CARD.darkHover} border-slate-800`
                }`}
                style={
                  plan.popular
                    ? {
                        backgroundColor: BRAND_COLOR.MUTED,
                        borderColor: BRAND_COLOR.DEFAULT,
                      }
                    : undefined
                }
              >
                {plan.popular && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wide shadow-sm"
                    style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
                  >
                    Mest populær
                  </div>
                )}

                <div className="mb-4">
                  <div className="w-10 h-10">
                    <Icon className={`w-full h-full ${iconColor}`} />
                  </div>
                </div>

                <h3 className={`text-xl font-bold ${SURFACE.TEXT} mb-2`}>
                  {plan.name}
                </h3>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1 tabular-nums">
                    <span
                      className={`text-3xl font-black ${plan.popular ? "" : SURFACE.TEXT}`}
                      style={
                        plan.popular
                          ? { color: BRAND_COLOR.DEFAULT }
                          : undefined
                      }
                    >
                      {plan.price === 0 ? "Gratis" : plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-sm ${SURFACE.TEXT_MUTED}`}>
                        kr/mnd
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? "" : "text-emerald-500"}`}
                        style={
                          plan.popular
                            ? { color: BRAND_COLOR.DEFAULT }
                            : undefined
                        }
                      />
                      <span className={SURFACE.TEXT_MUTED}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/priser`)}
                  className={`w-full px-4 py-3 ${RADIUS.button} font-semibold text-sm transition-all ${
                    plan.popular
                      ? `${BRAND.primary} shadow-md hover:shadow-lg`
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center space-y-2">
          <p className={`text-sm ${SURFACE.TEXT_MUTED} max-w-2xl mx-auto`}>
            <span className="font-semibold">KLT</span> er Klarpakkes
            belønningsvaluta (10 millioner totalt). Tjen KLT ved å lære – bruk
            dem til å låse opp innhold og delta i konkurranser. Du får KLT ved
            registrering og månedlig med alle betalte planer.
          </p>
          <p
            className={`text-sm font-medium text-amber-600 dark:text-amber-400 max-w-2xl mx-auto flex items-center justify-center gap-2 flex-wrap`}
          >
            <Trophy className="w-4 h-4 shrink-0" aria-hidden />
            50 000 KLT til månedens vinner – konkurrer på leaderboardet med
            paper trading og læring.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className={`text-sm ${SURFACE.TEXT_SUBTLE}`}>
            {showVipps
              ? "Vipps og betaling via Stripe (Visa, Mastercard, PayPal m.m.). Prisene er i norske kroner og inkluderer MVA."
              : "Betaling via Stripe (Visa, Mastercard, PayPal m.m.). Prisene er i norske kroner og inkluderer MVA."}
          </p>
        </div>
      </div>
    </section>
  );
}
