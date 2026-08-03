"use client";

import { Button } from "@/shared/ui/button";
import { Check, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const PLAN_SLUGS = ["student", "bachelor", "master", "phd", "professor"] as const;
const FEATURE_COUNT: Record<(typeof PLAN_SLUGS)[number], number> = {
  student: 4,
  bachelor: 4,
  master: 4,
  phd: 4,
  professor: 4,
};

export function PriserContent() {
  const t = useTranslations("pricingGrid");
  const locale = useLocale();

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {t("title")}
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {PLAN_SLUGS.map((slug) => {
          const price = Number(t(`plans.${slug}.price`));
          const popular = t(`plans.${slug}.popular`) === "true";
          return (
            <div
              key={slug}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                popular
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {t("mostPopular")}
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {t(`plans.${slug}.name`)}
              </h3>
              <div className="mb-4">
                {price === 0 ? (
                  <span className="text-3xl font-bold text-slate-900">
                    {t("free")}
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-slate-900">{price}</span>
                    <span className="text-slate-500"> {t("perMonth")}</span>
                  </>
                )}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {Array.from({ length: FEATURE_COUNT[slug] }, (_, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {t(`plans.${slug}.features.${i}`)}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/register?plan=${slug}`}
                className={`w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold transition-all ${
                  popular
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {price === 0 ? t("startFree") : t("choosePlan")}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="text-center text-sm text-slate-400">
        <HelpCircle className="w-4 h-4 inline mr-1" />
        {t("footnote")}
      </div>
    </div>
  );
}
