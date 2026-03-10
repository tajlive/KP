"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

const stepKeys = ["1", "2", "3", "4"] as const;

export default function GuidePage() {
  const locale = useLocale();
  const t = useTranslations("tradingGuide");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-gray-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        {stepKeys.map((step, i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex gap-6 items-start"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              {String(i + 1)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="text-gray-400">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-900/50 to-emerald-900/50 rounded-lg p-6 border border-blue-700/50">
        <h3 className="text-lg font-semibold text-white mb-2">
          {t("cta.title")}
        </h3>
        <p className="text-gray-300 mb-4">
          {t("cta.description")}
        </p>
        <Link
          href={`/${locale}/dashboard/trading`}
          className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
        >
          {t("cta.button")}
        </Link>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t("faq.title")}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white">
              {t("faq.q1.question")}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {t("faq.q1.answer")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">
              {t("faq.q2.question")}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {t("faq.q2.answer")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">
              {t("faq.q3.question")}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {t("faq.q3.answer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
