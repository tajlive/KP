"use client";

import { PaymentMethodSelector } from "@/features/payments/PaymentMethodSelector";
import { cn, createClient } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Check, CreditCard, Loader2, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CURRENCY_MAP,
  VALID_CURRENCIES,
  formatTierMoneyDisplay,
  getDisplayName,
  getPrice,
  getResolvedSubscriptionPriceId,
  parseCheckoutCurrency,
  planParamToTier,
  type CurrencyCode,
} from "@/lib/pricing.config";
import { User } from "@supabase/supabase-js";

export default function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("checkout");

  const tStudie = useTranslations("studieprogram.tiers");

  const planId = planParamToTier(searchParams?.get("plan") ?? null);

  const [billingCurrency, setBillingCurrency] = useState<CurrencyCode>(() => {
    const q = searchParams?.get("currency");
    if (q) return parseCheckoutCurrency(q);
    return CURRENCY_MAP[locale] ?? "NOK";
  });

  useEffect(() => {
    const q = searchParams?.get("currency");
    if (q) setBillingCurrency(parseCheckoutCurrency(q));
  }, [searchParams]);

  const name = getDisplayName(planId, locale);
  const monthlyAmount = getPrice(planId, "monthly", billingCurrency);
  const stripePriceId = getResolvedSubscriptionPriceId(
    planId,
    "monthly",
    billingCurrency,
  );

  const plan = useMemo(
    () => ({
      id: planId,
      name,
      priceLabel: formatTierMoneyDisplay(
        monthlyAmount,
        billingCurrency,
        locale,
      ),
      period: tStudie(`${planId}.period` as const),
      stripePriceId,
      features: (tStudie.raw(`${planId}.features` as const) as string[]) || [],
    }),
    [
      planId,
      name,
      monthlyAmount,
      billingCurrency,
      locale,
      stripePriceId,
      tStudie,
    ],
  );

  const [_user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const checkoutPath =
          billingCurrency !== "NOK"
            ? `/checkout?plan=${planId}&currency=${billingCurrency}`
            : `/checkout?plan=${planId}`;
        router.push(
          `/${locale}/innlogging?redirect=${encodeURIComponent(checkoutPath)}`,
        );
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [locale, planId, router, billingCurrency]);

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

  const trialZeroLabel = formatTierMoneyDisplay(0, billingCurrency, locale);
  const bachelorNoTrial = planId === "bachelor";

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/${locale}/priser`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backToPricing")}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">
              {t("yourOrder")}
            </h2>

            {planId !== "student" && (
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  {t("billingCurrency")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {VALID_CURRENCIES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setBillingCurrency(code)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm font-semibold transition-all border",
                        billingCurrency === code
                          ? "bg-[#635BFF] border-[#635BFF] text-white shadow-lg shadow-[#635BFF]/25"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600",
                      )}
                    >
                      {t(`currency.${code}` as "currency.NOK")}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {t("currencyHelp")}
                </p>
              </div>
            )}

            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-white text-lg">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm">{plan.period}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white tabular-nums">
                  {plan.priceLabel}
                </span>
                <span className="text-slate-500 text-sm block mt-1">
                  {t("perMonthSuffix")}
                </span>
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

            {bachelorNoTrial ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-100">
                  <strong>{t("bachelorNoTrialTitle")}</strong>
                  <br />
                  {t("bachelorNoTrialDescription")}
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-200">
                  <strong>{t("trialPeriod")}</strong>
                  <br />
                  {t("trialDescription")}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <span className="text-slate-400">
                {bachelorNoTrial ? t("totalDueToday") : t("totalToday")}
              </span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {bachelorNoTrial ? plan.priceLabel : trialZeroLabel}
              </span>
            </div>
          </motion.div>

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

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              {planId === "student" ? (
                <p className="text-slate-400 text-sm">
                  {t("studentPlanFree")}
                </p>
              ) : plan.stripePriceId ? (
                <PaymentMethodSelector
                  stripePlanId={plan.stripePriceId}
                  stripeTierSlug={planId}
                  stripePlanName={plan.name}
                  billingCurrency={billingCurrency}
                />
              ) : (
                <p className="text-amber-200 text-sm leading-relaxed">
                  {t("stripeNotConfigured")}
                </p>
              )}
            </div>

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
