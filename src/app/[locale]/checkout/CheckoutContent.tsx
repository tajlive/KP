"use client";

import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { createClient } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Shield,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getDisplayName,
  getPrice,
  getPriceId,
  planParamToTier,
  TierName,
} from "@/lib/pricing.config";
import { User } from "@supabase/supabase-js";

// ... imports remain the same

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("checkout");

  const tStudie = useTranslations("studieprogram.tiers");

  const planId = planParamToTier(searchParams?.get("plan") ?? null) as TierName;

  // Use centralized config
  const price = getPrice(planId, "monthly", "NOK");
  const stripePriceId = getPriceId(planId, "monthly", "NOK");
  const name = getDisplayName(planId, locale);

  const plan = {
    id: planId,
    name: name,
    price: price,
    period: tStudie(`${planId}.period` as const),
    stripePriceId: stripePriceId,
    features: (tStudie.raw(`${planId}.features` as const) as string[]) || [],
  };

  const [_user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/${locale}/innlogging?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`,
        );
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [locale, planId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/${locale}/priser`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backToPricing")}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">
              {t("yourOrder")}
            </h2>

            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-white text-lg">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm">{plan.period}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-slate-400"> kr</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-slate-300 text-sm"
                >
                  <Check className="w-5 h-5 text-green-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-200">
                <strong>{t("trialPeriod")}</strong>
                <br />
                {t("trialDescription")}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <span className="text-slate-400">{t("totalToday")}</span>
              <span className="text-2xl font-bold text-white">{t("free")}</span>
            </div>
          </motion.div>

          {/* Payment */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {t("paymentMethod")}
              </h2>
              <p className="text-slate-400 text-sm">
                {t("paymentDescription")}
              </p>
            </div>

            {/* Payment Methods - Side by side */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <PaymentMethodSelector
                stripePlanId={plan.stripePriceId}
                stripePlanName={plan.name}
              />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span>{t("securePayment")}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>{t("cardForInternational")}</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-600">
              {t("secureNote")}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
