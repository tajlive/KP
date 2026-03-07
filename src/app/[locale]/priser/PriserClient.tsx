"use client";

import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Sparkles, GraduationCap, BookOpen, Award } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const plans = [
  {
    key: "student",
    icon: Sparkles,
    popular: true,
    price: "0",
    period: "for alltid",
    badge: "Gratis for alltid",
  },
  {
    key: "bachelor",
    icon: BookOpen,
    popular: false,
    price: "299",
    period: "/måned",
    badge: null,
  },
  {
    key: "master",
    icon: GraduationCap,
    popular: false,
    price: "599",
    period: "/måned",
    badge: null,
  },
  {
    key: "phd",
    icon: Award,
    popular: false,
    price: "999",
    period: "/måned",
    badge: null,
  },
];

const features = {
  student: [
    "1M kr paper trading",
    "5 basis-moduler",
    "Community-tilgang",
    "E-post support",
  ],
  bachelor: [
    "Alt fra Student",
    "15+ moduler",
    "Paper trading med avanserte strategier",
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
    a: "Paper trading bruker virtuelle penger (1M kr) for risikofri øving. Live trading bruker ekte penger på Binance.",
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
  const locale = typeof window !== 'undefined' ? document.documentElement.lang : 'no';

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
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {plan.badge}
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
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {features[plan.key as keyof typeof features].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
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
                  { name: "Paper Trading", student: "✓", bachelor: "✓", master: "✓", phd: "✓" },
                  { name: "Moduler", student: "5", bachelor: "15+", master: "30+", phd: "50+" },
                  { name: "AI Assistent", student: "—", bachelor: "—", master: "✓", phd: "✓" },
                  { name: "Auto-trading", student: "—", bachelor: "—", master: "Paper", phd: "Paper + Live" },
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
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
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
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">Visa</div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">Mastercard</div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">Stripe</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href="/innlogging">
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
