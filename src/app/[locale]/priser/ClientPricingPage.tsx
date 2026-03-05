"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  Crown,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import { useTranslations } from "next-intl";

interface PricingProduct {
  tier: string;
  name: { no: string; en: string };
  description: { no: string; en: string };
  price: number;
  priceId: string;
  interval: string;
}

const tierIcons: Record<string, React.ReactNode> = {
  student: <span className="text-2xl">🎓</span>,
  bachelor: <span className="text-2xl">📈</span>,
  master: <span className="text-2xl">🏆</span>,
  phd: <span className="text-2xl">🎯</span>,
  professor: <Crown className="w-6 h-6 text-amber-500" />,
};

// Default priser mens vi venter på API (riktige priser fra nettsiden)
const DEFAULT_PRICES: Record<string, number> = {
  student: 0,
  bachelor: 24900,   // 249 kr/mnd
  master: 49900,     // 499 kr/mnd
  phd: 99900,        // 999 kr/mnd
  professor: 199900, // 1999 kr/mnd
};

export function ClientPricingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const t = useTranslations("studieprogram");
  const tPricing = useTranslations("pricing");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const supabase = createClient();

  // Hent priser fra API
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch('/api/pricing');
        const data = await res.json();
        if (data.success && data.products) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchPricing();
  }, []);

  // Hjelpefunksjon for å finne priceId fra API eller fallback
  function getPriceId(tierSlug: string): string {
    const product = products.find(p => p.tier === tierSlug);
    return product?.priceId || '';
  }

  // Hjelpefunksjon for å finne pris
  function getPrice(tierSlug: string): number {
    const product = products.find(p => p.tier === tierSlug);
    return product?.price || DEFAULT_PRICES[tierSlug] || 0;
  }

  // Hent features fra i18n (statisk data)
  function getTierFeatures(slug: string): string[] {
    try {
      return t.raw(`tiers.${slug}.features`) as string[];
    } catch {
      return [];
    }
  }

  const plans = [
    { slug: 'student', popular: false },
    { slug: 'bachelor', popular: false },
    { slug: 'master', popular: true },
    { slug: 'phd', popular: false },
    { slug: 'professor', popular: false },
  ].map(({ slug, popular }) => ({
    slug,
    name: t(`tiers.${slug}.name`),
    price: getPrice(slug),
    formattedPrice: (getPrice(slug) / 100).toFixed(0),
    period: slug === "student" ? t("tiers.student.period") : "/mnd",
    description: t(`tiers.${slug}.description`),
    features: getTierFeatures(slug),
    cta: t(`tiers.${slug}.cta`),
    popular,
    badge: popular ? t("sectionTitle") : undefined,
    icon: tierIcons[slug],
    priceId: getPriceId(slug),
  }));

  const handleCheckout = async (tierSlug: string) => {
    const priceId = getPriceId(tierSlug);
    
    if (!priceId && tierSlug !== 'student') {
      toast.error("Pris ikke tilgjengelig. Prøv igjen om et øyeblikk.");
      return;
    }

    if (tierSlug === 'student' || !priceId) {
      // Gratis plan - redirect til signup
      router.push(`/${locale}/signup?plan=${tierSlug}`);
      return;
    }

    setLoadingTier(tierSlug);

    try {
      // Sjekk om bruker er logget inn
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Du må være logget inn for å abonnere");
        router.push(`/${locale}/innlogging?redirect=/priser`);
        return;
      }

      // Stripe - via vår API
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Kunne ikke opprette Stripe checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Kunne ikke starte checkout");
      console.error('Checkout error:', error);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1118] font-sans text-white">
      {/* HERO */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden bg-[#0F1118] border-b border-[#2A2D3A]">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#0052FF]/10 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/20 text-[#6FA3FF] text-sm font-medium mb-8">
            <Crown className="w-4 h-4" />
            {t("title")}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            {t("sectionTitle")}
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {loadingProducts ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#0052FF]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative rounded-2xl p-8 flex flex-col h-full bg-[#171923] transition-all duration-300",
                    plan.popular
                      ? "border-2 border-[#0052FF] shadow-xl shadow-[#0052FF]/10 scale-105 z-10"
                      : "border border-[#2A2D3A] hover:border-[#0052FF]/50",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0052FF] text-white text-xs font-bold uppercase tracking-wide shadow-sm">
                      {tPricing("mostPopular")}
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#0F1118] flex items-center justify-center mb-6 border border-[#2A2D3A]">
                      {plan.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        {plan.formattedPrice}
                      </span>
                      <span className="text-sm font-medium text-white/40">
                        kr
                      </span>
                      <span className="text-white/40 text-sm ml-1">
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm border-b border-[#2A2D3A] pb-6">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-white/70 text-sm"
                      >
                        <Check
                          className={cn(
                            "w-5 h-5 shrink-0 mt-0.5",
                            plan.popular ? "text-[#0052FF]" : "text-[#0B9E5A]",
                          )}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Stripe-knapp */}
                  <Button
                    onClick={() => handleCheckout(plan.slug)}
                    disabled={loadingTier === plan.slug || (!plan.priceId && plan.slug !== 'student')}
                    className={cn(
                      "w-full h-12 rounded-xl text-base font-semibold transition-all",
                      plan.popular
                        ? "bg-[#0052FF] hover:bg-[#0041CC] text-white shadow-lg shadow-[#0052FF]/20"
                        : "bg-[#2A2D3A] hover:bg-[#3A3D4A] text-white border border-[#2A2D3A]",
                    )}
                  >
                    {loadingTier === plan.slug ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Laster...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {plan.cta}
                        {plan.popular && <ArrowRight className="w-4 h-4 ml-2" />}
                      </>
                    )}
                  </Button>


                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-sm text-white/40 mt-8">
            {t("disclaimer")}
          </p>
        </div>
      </section>
    </div>
  );
}
