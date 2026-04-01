"use client";

import { Button } from "@/shared/ui/button";
import { Check, HelpCircle, Coins } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { PaymentTrustLogos } from "@/features/landing/PaymentTrustLogos";
import { useVippsMarket } from "@/shared/providers/VippsMarketProvider";
import { getPriserPlans } from "./priser-plans";

const legacyFaqs = [
  {
    q: "Kan jeg bytte plan senere?",
    a: "Ja, du kan oppgradere eller nedgradere når som helst. Endringer trer i kraft ved neste faktureringsperiode.",
  },
  {
    q: "Hva er forskjellen på paper og live trading?",
    a: "Lekepenger er risikofri øving med 100 000 kr. Live trading bruker ekte penger på Binance.",
  },
  {
    q: "Kan jeg få refusjon?",
    a: "Ja, vi tilbyr 30-dagers pengene-tilbake-garanti. Ikke fornøyd? Få full refusjon.",
  },
  {
    q: "Er det bindingstid?",
    a: "Nei, ingen bindingstid. Du kan si opp når som helst.",
  },
];

function getTierFeatures(
  tStudy: ReturnType<typeof useTranslations<"studieprogram">>,
  slug: string,
): string[] {
  try {
    return tStudy.raw(`tiers.${slug}.features`) as string[];
  } catch {
    return [];
  }
}

export default function PriserClient() {
  const t = useTranslations("pricing");
  const tFoot = useTranslations("footer");
  const tStudy = useTranslations("studieprogram");
  const { showVipps } = useVippsMarket();
  const locale = useLocale();
  const plans = getPriserPlans();

  const kltFaq = { q: t("faqKlt.q"), a: t("faqKlt.a") };
  const faqs = [kltFaq, ...legacyFaqs];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100 pt-24 pb-16 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
        <p className="text-sm text-slate-500 mt-4">
          {locale === "no"
            ? "Listepris i NOK. I kassen kan du velge NOK, EUR eller USD."
            : "Prices shown in NOK. At checkout you can pay in NOK, EUR, or USD."}
        </p>
      </div>

      {/* KLT — tydeliggjør at det er belønningspoeng, ikke krypto */}
      <div className="bg-slate-900 text-slate-100 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5 rounded-lg bg-amber-500/15 p-2 text-amber-400">
              <Coins className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {t("klt.title")}
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {t("klt.body")}
              </p>
            </div>
          </div>
          <Link
            href={hrefWithLocale(locale, "/leaderboard")}
            className="shrink-0 text-sm font-medium text-[#6FA3FF] hover:text-white underline-offset-4 hover:underline self-start sm:self-center"
          >
            {t("klt.linkLeaderboard")}
          </Link>
        </div>
      </div>

      {/* Progress Arrow */}
      <div className="bg-blue-600 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-white text-xs sm:text-sm font-medium px-2">
            <span>Student</span>
            <span aria-hidden>→</span>
            <span>Bachelor</span>
            <span aria-hidden>→</span>
            <span>Master</span>
            <span aria-hidden>→</span>
            <span>PhD</span>
            <span aria-hidden>→</span>
            <span>Professor</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan) => (
            <Link
              key={plan.key}
              href={`${hrefWithLocale(locale, "/checkout")}?plan=${plan.key}`}
              className={`bg-white rounded-2xl p-6 border-2 relative flex flex-col transition-all hover:shadow-lg hover:-translate-y-1 ${
                plan.popular
                  ? "border-blue-600 shadow-xl shadow-blue-600/10"
                  : "border-slate-100 hover:border-slate-300"
              }`}
            >
              {(locale === "no" ? plan.badgeNo : plan.badgeEn) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
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
                  {tStudy(`tiers.${plan.key}.name`)}
                </h3>
                <p className="text-slate-500 text-sm">
                  {t(`plans.${plan.key}.description`)}
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-4 flex-wrap">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {plan.price === "0"
                      ? t("free")
                      : locale === "no"
                        ? `${plan.price} kr`
                        : `${plan.price} NOK`}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-slate-500 text-sm">
                      {locale === "no" ? plan.periodNo : plan.periodEn}
                    </span>
                  )}
                  {plan.price === "0" && (
                    <span className="text-slate-500 text-sm">
                      {locale === "no" ? "for alltid" : "forever"}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {getTierFeatures(tStudy, plan.key).map((feature, i) => (
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
                {plan.price === "0" ? t("startFree") : t("startTrial")}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">
            {t("comparison.title")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold">
                    {t("comparison.feature")}
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    Student
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    Bachelor
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    Master
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    PhD
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    Professor
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: t("comparison.rowPaper"),
                    student: "✓",
                    bachelor: "✓",
                    master: "✓",
                    phd: "✓",
                    professor: "✓",
                  },
                  {
                    name: t("comparison.kltLabel"),
                    student: t("comparison.kltStudent"),
                    bachelor: t("comparison.kltBachelor"),
                    master: t("comparison.kltMaster"),
                    phd: t("comparison.kltPhd"),
                    professor: t("comparison.kltProfessor"),
                  },
                  {
                    name: t("comparison.rowModules"),
                    student: "5",
                    bachelor: "15+",
                    master: "30+",
                    phd: "50+",
                    professor: "50+",
                  },
                  {
                    name: t("comparison.rowAi"),
                    student: "—",
                    bachelor: "✓",
                    master: "✓",
                    phd: "✓",
                    professor: "✓",
                  },
                  {
                    name: t("comparison.rowAutoTrading"),
                    student: t("comparison.autoStudent"),
                    bachelor: t("comparison.autoBachelor"),
                    master: t("comparison.autoMaster"),
                    phd: t("comparison.autoPhd"),
                    professor: t("comparison.autoProfessor"),
                  },
                  {
                    name: t("comparison.rowTax"),
                    student: "—",
                    bachelor: "✓",
                    master: "✓",
                    phd: "✓",
                    professor: "✓",
                  },
                  {
                    name: t("comparison.rowSupport"),
                    student: t("comparison.supportStudent"),
                    bachelor: t("comparison.supportBachelor"),
                    master: t("comparison.supportMaster"),
                    phd: t("comparison.supportPhd"),
                    professor: t("comparison.supportProfessor"),
                  },
                  {
                    name: t("comparison.rowDiscord"),
                    student: t("comparison.discordStudent"),
                    bachelor: t("comparison.discordBachelor"),
                    master: t("comparison.discordMaster"),
                    phd: t("comparison.discordPhd"),
                    professor: t("comparison.discordProfessor"),
                  },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm max-w-[140px] sm:max-w-none">
                      {row.name}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">
                      {row.student}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-blue-600">
                      {row.bachelor}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">
                      {row.master}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">
                      {row.phd}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">
                      {row.professor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">
          {t("faq.title")}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl border border-slate-100"
            >
              <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                {faq.q}
              </h3>
              <p className="text-slate-600 ml-8">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges — samme merker som footer (Vipps + Stripe-kort/PayPal) */}
      <div className="bg-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-600 mb-4">{t("trust.title")}</p>
          <PaymentTrustLogos
            variant="light"
            showVipps={showVipps}
            stripeBadgeAriaLabel={tFoot("stripeBadgeAria")}
          />
          <p className="text-xs text-slate-500 mt-3 max-w-lg mx-auto">
            {showVipps
              ? tFoot("paymentSubtitle")
              : tFoot("paymentSubtitleNoVipps")}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href={hrefWithLocale(locale, "/login")}>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              {t("cta.button")}
            </Button>
          </Link>
          <p className="text-blue-200 text-sm mt-4">{t("cta.guarantee")}</p>
        </div>
      </div>
    </div>
  );
}
