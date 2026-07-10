"use client";

import {
  UserPlus,
  Wallet,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function ThreeSteps() {
  const locale = useLocale();
  const t = useTranslations("threeSteps");
  const { user } = useAuth();

  const steps = [
    {
      icon: UserPlus,
      number: "01",
      title: t("step1.title"),
      description: t("step1.description"),
      color: "bg-[#3B82F6]",
    },
    {
      icon: Wallet,
      number: "02",
      title: t("step2.title"),
      description: t("step2.description"),
      color: "bg-[#F59E0B]",
    },
    {
      icon: Bot,
      number: "03",
      title: t("step3.title"),
      description: t("step3.description"),
      color: "bg-[#10B981]",
    },
  ];

  return (
    <div data-testid="three-steps" suppressHydrationWarning className="pt-10 pb-8 md:pt-16 md:pb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F9FAFB] mb-3">
          {t("sectionTitle")}
        </h2>
        <p className="text-sm sm:text-base text-[#9CA3AF] max-w-2xl mx-auto">
          {t("sectionSubtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className="relative glass-card text-center flex flex-col items-center"
          >
            {/* Step number */}
            <div
              className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
            >
              <step.icon className="w-6 h-6 text-white" />
            </div>

            {/* Number badge */}
            <span className="absolute top-4 right-4 text-3xl font-black text-[#2A2D35] select-none">
              {step.number}
            </span>

            {/* Content */}
            <h3 className="text-lg sm:text-xl font-bold text-[#F9FAFB] mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-8">
        <Link
          href={hrefWithLocale(locale, user ? "/dashboard" : "/register")}
          className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold rounded-xl no-underline shadow-lg shadow-[#F59E0B]/25 min-h-[48px] transition-all"
        >
          {user ? (
            <Bot className="w-5 h-5" aria-hidden />
          ) : (
            <UserPlus className="w-5 h-5" aria-hidden />
          )}
          {user ? t("ctaButtonLoggedIn") : t("ctaButton")}
        </Link>
        <p className="text-[#6B7280] text-sm mt-3">
          {user ? t("ctaSubtextLoggedIn") : t("ctaSubtext")}
        </p>
      </div>
    </div>
  );
}
