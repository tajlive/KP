'use client';

import { Check, X, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ComparisonSection() {
  const t = useTranslations("landing.comparison");
  const features = [
    { name: t("featureNorsk"), klarpakke: true, tradingskolen: true, nordic: false },
    { name: t("featurePaper"), klarpakke: true, tradingskolen: t("limited"), nordic: false },
    { name: t("featureAI"), klarpakke: t("yes"), tradingskolen: t("unavailable"), nordic: false },
    { name: t("featureVideo"), klarpakke: true, tradingskolen: t("onlyLive"), nordic: true },
    { name: t("featurePace"), klarpakke: true, tradingskolen: false, nordic: true },
    { name: t("featureCert"), klarpakke: true, tradingskolen: false, nordic: t("partial") },
    { name: t("featureBroker"), klarpakke: true, tradingskolen: false, nordic: true },
    { name: t("featureCopy"), klarpakke: t("comingSoon"), tradingskolen: false, nordic: false },
    { name: t("featurePrice"), klarpakke: '249–1 999 kr', tradingskolen: t("free"), nordic: '21 200 kr' },
  ];

  const renderCell = (value: boolean | string, isKlarpakke = false) => {
    if (value === true) {
      return (
        <div className="flex items-center justify-center">
          <div className={`w-7 h-7 rounded-full ${
            isKlarpakke 
              ? 'bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50' 
              : 'bg-green-100 dark:bg-green-900/30'
          } flex items-center justify-center`}>
            <Check className={`w-4 h-4 ${
              isKlarpakke 
                ? 'text-white' 
                : 'text-green-600 dark:text-green-400'
            }`} />
          </div>
        </div>
      );
    }
    if (value === false) {
      return (
        <div className="flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
        </div>
      );
    }
    return (
      <div className={`text-center text-sm font-medium ${
        isKlarpakke 
          ? 'text-blue-600 dark:text-blue-400 font-semibold' 
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {value}
      </div>
    );
  };

  return (
    <section className="py-20 bg-linear-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            {t("badge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Comparison Table */}
        <div className="relative">
          {/* Spotlight badge for Klarpakke column */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 md:left-[42%] z-10">
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t("bestChoice")}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden mt-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800">
                    <th className="px-6 py-5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      {t("featuresLabel")}
                    </th>
                    <th className="px-6 py-5 text-center bg-linear-to-b from-blue-600 to-indigo-600 text-white relative">
                      {/* Highlight glow */}
                      <div className="absolute inset-0 bg-linear-to-b from-blue-500/20 to-transparent pointer-events-none" />
                      <div className="relative">
                        <div className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                          {t("colKlarpakke")}
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium opacity-90">
                          {t("youAreHere")}
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("colTradingskolen")}
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("colNordic")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {features.map((feature, idx) => (
                    <tr 
                      key={idx} 
                      className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 bg-blue-50/30 dark:bg-blue-900/10 group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/20 transition-colors">
                        {renderCell(feature.klarpakke, true)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell(feature.tradingskolen)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell(feature.nordic)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer notes */}
            <div className="px-6 py-4 bg-linear-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">*</span>
                  <span>{t("footerNote1")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>{t("footerNote2")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {t("ctaLine")}<span className="font-bold text-gray-900 dark:text-white">{t("ctaEmphasis1")}</span> <span className="font-bold text-blue-600">{t("ctaEmphasis2")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
