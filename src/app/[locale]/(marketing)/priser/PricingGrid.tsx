"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { type BillingPeriod, getPriserPlans } from "./priser-plans";

interface PricingGridProps {
  locale: string;
  getTierFeatures: (slug: string) => string[];
  translations: {
    startFree: string;
    startTrial: string;
    free: string;
    freeForever: string;
    plans: Record<string, { description: string }>;
  };
  tierNames: Record<string, string>;
}

export function PricingGrid({ locale, getTierFeatures, translations, tierNames }: PricingGridProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const plans = getPriserPlans(period);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-3 bg-slate-100 rounded-2xl p-1.5">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              period === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Månedlig
          </button>
          <button
            onClick={() => setPeriod("annual")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              period === "annual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Årlig
            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              Spar 17%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => (
          <Link
            key={plan.key}
            href={`${hrefWithLocale(locale, "/checkout")}?plan=${plan.key}&period=${period}`}
            className={`bg-white rounded-2xl p-6 border-2 relative flex flex-col transition-all hover:shadow-lg hover:-translate-y-1 ${
              plan.popular
                ? "border-blue-600 shadow-xl shadow-blue-600/10"
                : "border-slate-100 hover:border-slate-300"
            }`}
          >
            {/* Badge */}
            {(locale === "no" ? plan.badgeNo : plan.badgeEn) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  plan.savePercent
                    ? "bg-green-500 text-white"
                    : "bg-green-500 text-white"
                }`}>
                  {locale === "no" ? plan.badgeNo : plan.badgeEn}
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                  plan.popular
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <plan.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {tierNames[plan.key] || plan.key}
              </h3>
              <p className="text-slate-500 text-sm">
                {translations.plans[plan.key]?.description || ""}
              </p>

              {/* Price */}
              <div className="mt-4">
                {plan.price === "0" ? (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {translations.free}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {translations.freeForever}
                    </span>
                  </div>
                ) : plan.isAnnual ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-slate-900 tabular-nums">
                        {plan.price} kr
                      </span>
                      <span className="text-slate-500 text-sm">
                        {locale === "no" ? plan.periodNo : plan.periodEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {plan.annualMonthlyEq} kr/mnd • {locale === "no" ? "faktureres årlig" : "billed annually"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {plan.price} kr
                    </span>
                    <span className="text-slate-500 text-sm">
                      {locale === "no" ? plan.periodNo : plan.periodEn}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {getTierFeatures(plan.key).map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-slate-600 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full ${
                plan.popular
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
              tabIndex={-1}
            >
              {plan.price === "0" ? translations.startFree : translations.startTrial}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
