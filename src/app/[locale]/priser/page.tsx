import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/pricing/tiers";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  Crown,
  Gift,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

// ISR - oppdateres hver time
export const revalidate = 3600;

const tierIcons: Record<string, React.ReactNode> = {
  student: <Star className="w-6 h-6 text-slate-400" />,
  bachelor: <Sparkles className="w-6 h-6 text-blue-500" />,
  master: <Zap className="w-6 h-6 text-yellow-500" />,
  phd: <Target className="w-6 h-6 text-orange-500" />,
  professor: <Crown className="w-6 h-6 text-emerald-500" />,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Priser",
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studieprogram" });
  const tPricing = await getTranslations({ locale, namespace: "pricing" });

  const spotsLeft = 47;
  const spotsTotal = 100;

  // Bygg plans-array fra TIERS SSK
  const plans = Object.entries(TIERS).map(([slug, tier]) => ({
    slug,
    name: t(`tiers.${slug}.name`),
    price: tier.priceNOK.toString(),
    period: t(`tiers.${slug}.period`),
    description: t(`tiers.${slug}.description`),
    features: t.raw(`tiers.${slug}.features`) as string[],
    cta: t(`tiers.${slug}.cta`),
    popular: tier.popular,
    icon: tierIcons[slug],
  }));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HERO */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-8">
            <Trophy className="w-4 h-4" />
            {t("title")}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            {t("sectionTitle")}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={cn(
                  "relative rounded-2xl p-8 flex flex-col h-full bg-white transition-all duration-300",
                  plan.popular
                    ? "border-2 border-blue-600 shadow-xl shadow-blue-600/10 scale-105 z-10"
                    : "border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wide shadow-sm">
                    {tPricing("mostPopular")}
                  </div>
                )}

                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6">
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      kr
                    </span>
                    <span className="text-slate-400 text-sm ml-1">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm border-b border-slate-100 pb-6">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-600 text-sm"
                    >
                      <Check
                        className={cn(
                          "w-5 h-5 shrink-0 mt-0.5",
                          plan.popular ? "text-blue-600" : "text-green-500",
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CheckoutButton håndterer både gratis (student) og betalt */}
                <CheckoutButton
                  tierSlug={plan.slug as import("@/lib/pricing/tiers").TierSlug}
                  locale={locale}
                  label={plan.cta}
                  popular={plan.popular}
                />
              </div>
            ))}
          </div>

          {/* KLT Info */}
          <div className="mt-12 bg-blue-50 rounded-2xl p-6 max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span>💎</span> Hva er KLT tokens?
            </h3>
            <p className="text-slate-600 text-sm">
              KLT tokens er Klarpakkes belønningsvaluta — bruk dem til å låse
              opp eksklusivt innhold, prioritert support og spesielle
              funksjoner. Du får KLT tokens ved registrering (500) og månedlig
              med alle betalte planer (opptil 10 000/mnd).
            </p>
          </div>

          {/* Betalingsinfo */}
          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <span>Sikker betaling med:</span>
              <span className="font-semibold text-[#635BFF]">Stripe</span>
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-medium">
                Prisene er i norske kroner og inkluderer MVA (25%).
              </span>
              <br />
              Ingen binding — avslutt når som helst.
            </p>
          </div>
        </div>
      </section>

      {/* FOUNDER OFFER */}
      <section className="py-20 px-4 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              FOUNDER OFFER
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Bli en av våre første partnere
            </h2>

            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Vi bygger fremtidens handelsplattform. De som er med oss fra
              starten vil alltid ha en spesiell plass i vårt økosystem – med
              fordeler som varer livet ut.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-xl flex items-center gap-4 text-left">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Gift className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-bold">10,000 KLT Tokens</div>
                  <div className="text-xs text-slate-400">Gratis airdrop</div>
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-xl flex items-center gap-4 text-left">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <div className="font-bold">Founder Badge</div>
                  <div className="text-xs text-slate-400">På din profil</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold h-14 px-10 rounded-xl text-lg mb-8"
                asChild
              >
                <Link href={`/${locale}/beta/apply`}>
                  Sikre min plass nå <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="font-handwriting text-2xl text-slate-300 -rotate-2">
                  Tom Jensen
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Founder &amp; CEO
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
