"use client";

import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Sparkles, GraduationCap, BookOpen, Award } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

const plans = [
  {
    key: "student",
    icon: Sparkles,
    popular: true,
    price: "0",
    periodNo: "for alltid",
    periodEn: "forever",
    badgeNo: "Gratis for alltid",
    badgeEn: "Free forever",
  },
  {
    key: "bachelor",
    icon: BookOpen,
    popular: false,
    price: "249",
    periodNo: "/måned",
    periodEn: "/month",
    badgeNo: null,
    badgeEn: null,
  },
  {
    key: "master",
    icon: GraduationCap,
    popular: false,
    price: "499",
    periodNo: "/måned",
    periodEn: "/month",
    badgeNo: null,
    badgeEn: null,
  },
  {
    key: "phd",
    icon: Award,
    popular: false,
    price: "999",
    periodNo: "/måned",
    periodEn: "/month",
    badgeNo: null,
    badgeEn: null,
  },
];

const features = {
  student: [
    "1M kr lekepenger",
    "5 basis-moduler",
    "Community-tilgang",
    "E-post support",
  ],
  bachelor: [
    "Alt fra Student",
    "15+ moduler",
    "Lekepenger med avanserte strategier",
    "Discord VIP-kanal",
    "Prioritet support",
  ],
  master: [
    "Alt fra Bachelor",
    "30+ moduler",
    "AI-trading assistent",
    "Auto-trading bot (paper)",
    "Skatterapport",
    "1-on-1 månedlig review",
  ],
  phd: [
    "Alt fra Master",
    "Alle kurs (50+ moduler)",
    "Ukentlig 1-on-1 mentoring",
    "Eksklusive strategier",
    "API-tilgang",
    "White-glove support",
  ],
};

const faqs = [
  {
    q: "Kan jeg bytte plan senere?",
    a: "Ja, du kan oppgradere eller nedgradere når som helst. Endringer trer i kraft ved neste faktureringsperiode.",
  },
  {
    q: "Hva er forskjellen på paper og live trading?",
    a: "Lekepenger er risikofri øving med 1M kr. Live trading bruker ekte penger på Binance.",
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
  const locale = useLocale();

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
          {locale === 'no' ? 'Priser i NOK. For English: Prices in EUR/USD at checkout.' : 'Prices in EUR for international customers'}
        </p>
      </div>

      {/* Progress Arrow */}
      <div className="bg-blue-600 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
            <span>Student</span>
            <span>→</span>
            <span>Bachelor</span>
            <span>→</span>
            <span>Master</span>
            <span>→</span>
            <span>PhD</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl p-6 border-2 relative flex flex-col ${
                plan.popular
                  ? "border-blue-600 shadow-xl shadow-blue-600/10"
                  : "border-slate-100"
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
                    plan.popular ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <plan.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 capitalize">
                  {plan.key}
                </h3>
                <p className="text-slate-500 text-sm">
                  {t(`plans.${plan.key}.description`)}
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-4">
                  <span className="text-3xl font-bold text-slate-900">
                    {plan.price === "0" ? t("free") : `${plan.price} kr`}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-slate-500 text-sm">{locale === "no" ? plan.periodNo : plan.periodEn}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {features[plan.key as keyof typeof features].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/${locale}/checkout?plan=${plan.key}`}>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {plan.price === "0" ? t("startFree") : t("startTrial")}
                </Button>
              </Link>
            </div>
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
                  <th className="text-left py-3 px-4 font-semibold">{t("comparison.feature")}</th>
                  <th className="text-center py-3 px-4">Student</th>
                  <th className="text-center py-3 px-4">Bachelor</th>
                  <th className="text-center py-3 px-4">Master</th>
                  <th className="text-center py-3 px-4">PhD</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Lekepenger", student: "✓", bachelor: "✓", master: "✓", phd: "✓" },
                  { name: "Moduler", student: "5", bachelor: "15+", master: "30+", phd: "50+" },
                  { name: "AI Assistent", student: "—", bachelor: "—", master: "✓", phd: "✓" },
                  { name: "Auto-trading", student: "—", bachelor: "—", master: "Lekepenger", phd: "Lekepenger + Live" },
                  { name: "Support", student: "E-post", bachelor: "Prioritet", master: "1-on-1 mnd", phd: "Ukentlig" },
                  { name: "Discord", student: "Community", bachelor: "VIP", master: "VIP", phd: "VIP + Mentor" },
                  { name: "Skatterapport", student: "—", bachelor: "—", master: "✓", phd: "✓" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-4 font-medium">{row.name}</td>
                    <td className="py-3 px-4 text-center">{row.student}</td>
                    <td className="py-3 px-4 text-center text-blue-600">{row.bachelor}</td>
                    <td className="py-3 px-4 text-center">{row.master}</td>
                    <td className="py-3 px-4 text-center">{row.phd}</td>
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
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                {faq.q}
              </h3>
              <p className="text-slate-600 ml-8">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-600 mb-4">{t("trust.title")}</p>
          <div className="flex items-center justify-center gap-6">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">Vipps</div>
            <div className="bg-white px-4 py-3 rounded-lg shadow-sm flex items-center">
              <svg viewBox="0 0 780 500" className="h-6 w-auto" aria-label="Visa">
                <path d="M293.2 348.7l33.4-195.8h53.4l-33.4 195.8h-53.4zM540.7 158.1c-10.6-4-27.2-8.3-47.9-8.3-52.8 0-90 26.6-90.3 64.6-.3 28.1 26.5 43.8 46.7 53.2 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-31.9 19.1-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 43.8c12.5 5.5 35.6 10.2 59.6 10.5 56.2 0 92.6-26.3 93-67 .2-22.3-14.1-39.3-45-53.3-18.7-9.1-30.2-15.1-30.1-24.3 0-8.1 9.7-16.8 30.7-16.8 17.5-.3 30.2 3.5 40.1 7.5l4.8 2.3 7.3-42.3zM648.1 152.9h-41.3c-12.8 0-22.4 3.5-28 16.3l-79.3 179.5h56.1s9.2-24.1 11.2-29.4c6.1 0 60.6.1 68.4.1 1.6 6.9 6.5 29.3 6.5 29.3h49.6l-43.2-195.8zm-65.9 126.3c4.4-11.3 21.3-54.7 21.3-54.7-.3.5 4.4-11.3 7.1-18.7l3.6 16.9s10.2 46.8 12.4 56.5h-44.4zM233.8 152.9l-52.3 133.5-5.6-27.1c-9.7-31.2-40-65.1-73.9-82l47.8 170.9 56.6-.1 84.2-195.3h-56.8z" fill="#1A1F71" />
                <path d="M146.9 152.9H59.6l-.7 3.8c67.1 16.2 111.5 55.4 129.9 102.5l-18.7-90.1c-3.2-12.4-12.8-15.8-23.2-16.2z" fill="#F7A600" />
              </svg>
            </div>
            <div className="bg-white px-4 py-3 rounded-lg shadow-sm flex items-center">
              <svg viewBox="0 0 780 500" className="h-6 w-auto" aria-label="Mastercard">
                <circle cx="330" cy="250" r="170" fill="#EB001B" />
                <circle cx="450" cy="250" r="170" fill="#F79E1B" />
                <path d="M390 120.8c-40.5 32-66.5 80.6-66.5 135.2s26 103.2 66.5 135.2c40.5-32 66.5-80.6 66.5-135.2S430.5 152.8 390 120.8z" fill="#FF5F00" />
              </svg>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">Stripe</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href={`/${locale}/innlogging`}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold">
              {t("cta.button")}
            </Button>
          </Link>
          <p className="text-blue-200 text-sm mt-4">{t("cta.guarantee")}</p>
        </div>
      </div>
    </div>
  );
}
