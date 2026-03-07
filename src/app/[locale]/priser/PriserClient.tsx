"use client";

import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Sparkles, Star, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const plans = [
  {
    key: "starter",
    icon: Sparkles,
    popular: false,
    price: "0",
    period: "for alltid",
  },
  {
    key: "pro",
    icon: Zap,
    popular: true,
    price: "499",
    period: "/måned",
  },
  {
    key: "premium",
    icon: Star,
    popular: false,
    price: "999",
    period: "/måned",
  },
];

const features = {
  starter: [
    "Paper trading med 1M kr",
    "Basis kurs (5 moduler)",
    "Community tilgang",
    "E-post support",
    "KLT token belønninger",
  ],
  pro: [
    "Alt fra Starter",
    "Avanserte kurs (15+ moduler)",
    "AI trading assistent",
    "Auto-trading bot",
    "Prioritet support",
    "Discord VIP kanal",
    "Skatterapport",
  ],
  premium: [
    "Alt fra Pro",
    "1-on-1 mentoring",
    "Eksklusive strategier",
    "API tilgang",
    "White-glove support",
    "Early access features",
    "Ubegrensede KLT tokens",
  ],
};

const faqs = [
  {
    q: "Kan jeg bytte plan senere?",
    a: "Ja, du kan oppgradere eller nedgradere når som helst. Endringer trer i kraft ved neste faktureringsperiode.",
  },
  {
    q: "Hva skjer etter prøveperioden?",
    a: "Etter 14 dager velger du om du vil fortsette. Ingen automatisk belastning hvis du sier opp før prøveperioden er over.",
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

export default function PriserClient() {
  const t = useTranslations("pricing");

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
        <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
          <Check className="w-4 h-4" />
          {t("hero.trial")}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`bg-white rounded-3xl p-8 border-2 relative ${
                plan.popular
                  ? "border-blue-600 shadow-xl shadow-blue-600/10"
                  : "border-slate-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {t("popular")}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    plan.popular ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <plan.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {t(`plans.${plan.key}.name`)}
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  {t(`plans.${plan.key}.description`)}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price === "0" ? t("free") : `${plan.price} kr`}
                  </span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {features[plan.key as keyof typeof features].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.popular ? "text-blue-600" : "text-green-500"
                      }`}
                    />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/checkout?plan=${plan.key}`}>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                  size="lg"
                >
                  {plan.price === "0" ? t("startFree") : t("startTrial")}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            {t("comparison.title")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">
                    {t("comparison.feature")}
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">
                    {t("plans.starter.name")}
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-blue-600">
                    {t("plans.pro.name")}
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">
                    {t("plans.premium.name")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Paper Trading", starter: "✓", pro: "✓", premium: "✓" },
                  { name: "Basis kurs", starter: "5 moduler", pro: "15+ moduler", premium: "20+ moduler" },
                  { name: "AI Assistent", starter: "—", pro: "✓", premium: "✓" },
                  { name: "Auto-trading", starter: "—", pro: "✓", premium: "✓" },
                  { name: "Support", starter: "E-post", pro: "Prioritet", premium: "1-on-1" },
                  { name: "Discord", starter: "Community", pro: "VIP", premium: "VIP + Mentor" },
                  { name: "API tilgang", starter: "—", pro: "—", premium: "✓" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-4 px-4 text-slate-700">{row.name}</td>
                    <td className="py-4 px-4 text-center text-slate-600">{row.starter}</td>
                    <td className="py-4 px-4 text-center text-blue-600 font-medium">{row.pro}</td>
                    <td className="py-4 px-4 text-center text-slate-600">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          {t("faq.title")}
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                {faq.q}
              </h3>
              <p className="text-slate-600 ml-8">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href="/checkout?plan=pro">
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
