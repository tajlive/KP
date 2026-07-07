import { Button } from "@/shared/ui/button";
import { Check, HelpCircle, Coins } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { PaymentTrustLogos } from "@/features/landing/PaymentTrustLogos";
import { PricingGrid } from "./PricingGrid";
import { getPriserPlans, PRISER_PLAN_ORDER } from "./priser-plans";
import { PrimaryCtaSection } from "@/features/marketing/components";

function getTierFeatures(
  tStudy: { raw: (key: string) => unknown },
  slug: string,
): string[] {
  try {
    return tStudy.raw(`tiers.${slug}.features`) as string[];
  } catch {
    return [];
  }
}

export async function PriserContent({
  locale,
  showVipps,
}: {
  locale: string;
  showVipps: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tFoot = await getTranslations({ locale, namespace: "footer" });
  const tStudy = await getTranslations({ locale, namespace: "studieprogram" });
  const plans = getPriserPlans();
  const tierNames: Record<string, string> = {};
  for (const key of PRISER_PLAN_ORDER) {
    tierNames[key] = tStudy(`tiers.${key}.name`) as string;
  }
  const planDescriptions: Record<string, { description: string }> = {};
  for (const key of PRISER_PLAN_ORDER) {
    planDescriptions[key] = { description: t(`plans.${key}.description`) as string };
  }

  const legacyFaqs = [
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
  ];
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
          {t("hero.currencyNote")}
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
            <span>{tStudy("tiers.student.name")}</span>
            <span aria-hidden>→</span>
            <span>{tStudy("tiers.bachelor.name")}</span>
            <span aria-hidden>→</span>
            <span>{tStudy("tiers.master.name")}</span>
            <span aria-hidden>→</span>
            <span>{tStudy("tiers.phd.name")}</span>
            <span aria-hidden>→</span>
            <span>{tStudy("tiers.professor.name")}</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <PricingGrid
        locale={locale}
        getTierFeatures={(slug) => getTierFeatures(tStudy, slug)}
        translations={{
          startFree: t("startFree"),
          startTrial: t("startTrial"),
          free: t("free"),
          freeForever: t("freeForever"),
          plans: planDescriptions,
        }}
        tierNames={tierNames}
      />

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
                    {tStudy("tiers.student.name")}
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tStudy("tiers.bachelor.name")}
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tStudy("tiers.master.name")}
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tStudy("tiers.phd.name")}
                  </th>
                  <th className="text-center py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tStudy("tiers.professor.name")}
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

      {/* CTA - Using shared component with tracking */}
      <PrimaryCtaSection
        title={t("cta.title")}
        description={t("cta.subtitle")}
        primaryLabel={t("cta.button")}
        primaryHref="/login"
        variant="pricing"
        locale={locale}
        trackingId="pricing-primary"
        funnelStage="pricing"
      />
    </div>
  );
}
