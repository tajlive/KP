"use client";

import {
  UserPlus,
  BookOpen,
  Gamepad2,
  Rocket,
  LayoutDashboard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function ThreeSteps() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("threeSteps");
  const { user } = useAuth();

  const steps = [
    {
      icon: UserPlus,
      number: "01",
      title: t("step1.title"),
      description: t("step1.description"),
      color: "bg-[#0052FF]",
    },
    {
      icon: BookOpen,
      number: "02",
      title: t("step2.title"),
      description: t("step2.description"),
      color: "bg-amber-500",
    },
    {
      icon: Gamepad2,
      number: "03",
      title: t("step3.title"),
      description: t("step3.description"),
      color: "bg-indigo-500",
    },
    {
      icon: Rocket,
      number: "04",
      title: t("step4.title"),
      description: t("step4.description"),
      color: "bg-purple-500",
      badge: t("step4.badge"),
      optional: true,
    },
  ];

  return (
    <div suppressHydrationWarning className="pt-16 pb-12 md:pt-24 md:pb-16">
      <div className="text-center mb-12">
        <h2 className="font-fraunces text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          {t("sectionTitle")}
        </h2>
        <p className="font-lexend text-slate-400 max-w-2xl mx-auto">
          {t("sectionSubtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className={`relative bg-slate-800/50 border rounded-2xl p-6 md:p-8 group hover:border-slate-600 transition-colors ${
              step.optional ? "border-purple-700/50" : "border-slate-700"
            }`}
          >
            {/* Connector line (hidden on mobile) */}
            {idx < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-slate-700" />
            )}

            {/* Step number */}
            <div
              className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mb-6`}
            >
              <step.icon className="w-6 h-6 text-white" />
            </div>

            {/* Number badge */}
            <span className="absolute top-6 right-6 font-fraunces text-4xl font-bold text-slate-700/50">
              {step.number}
            </span>

            {/* Optional badge */}
            {step.badge && (
              <span className="absolute top-6 left-20 bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded">
                {step.badge}
              </span>
            )}

            {/* Content */}
            <h3 className="font-fraunces text-xl font-bold text-slate-100 mb-3">
              {step.title}
            </h3>
            <p className="font-lexend text-slate-400 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <button
          type="button"
          onClick={() =>
            router.push(hrefWithLocale(locale, user ? "/dashboard" : "/register"))
          }
          className="bg-teal-500 hover:bg-teal-600 text-white font-lexend font-medium px-8 py-4 rounded-xl transition-colors inline-flex items-center gap-2 min-h-[48px]"
        >
          {user ? (
            <LayoutDashboard className="w-5 h-5" aria-hidden />
          ) : (
            <UserPlus className="w-5 h-5" aria-hidden />
          )}
          {user ? t("ctaButtonLoggedIn") : t("ctaButton")}
        </button>
        <p className="font-lexend text-slate-500 text-sm mt-4">
          {user ? t("ctaSubtextLoggedIn") : t("ctaSubtext")}
        </p>
      </div>
    </div>
  );
}
