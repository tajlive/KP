"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getProfileOnboardingExtended } from "@/lib/supabase/helpers";
import { BookOpen, TrendingUp, Award } from "lucide-react";

const EXPERIENCE_OPTIONS = [
  { value: "beginner", icon: BookOpen },
  { value: "intermediate", icon: TrendingUp },
  { value: "expert", icon: Award },
] as const;

export default function OnboardingStep2() {
  const t = useTranslations("onboarding.step2");
  const router = useRouter();
  const locale = useLocale();
  const supabase = createClient();
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const steps = [
    `/${locale}/onboarding/step1-welcome`,
    `/${locale}/onboarding/step2-experience`,
    `/${locale}/onboarding/step3-trading-mode`,
    `/${locale}/onboarding/step4-binance`,
    `/${locale}/onboarding/step5-complete`,
  ];

  // Sjekk auth og redirect hvis nødvendig
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${locale}/login?next=/onboarding/step2-experience`);
        return;
      }

      const { data: profile } = await getProfileOnboardingExtended(supabase, user.id);

      if (profile?.onboarding_completed) {
        router.push(`/${locale}/dashboard`);
        return;
      }

      // Hvis brukeren er på steg 0, send til steg 1
      if (!profile?.onboarding_step || profile.onboarding_step < 1) {
        router.push(steps[0]);
        return;
      }

      // Hvis brukeren er på et senere steg, send dit
      if (profile.onboarding_step > 1) {
        router.push(steps[profile.onboarding_step]);
        return;
      }

      // Hvis brukeren allerede har valgt erfaring, pre-fill
      if (profile?.trading_experience) {
        setSelected(profile.trading_experience);
      }

      setInitializing(false);
    };

    checkStatus();
  }, [router, supabase, locale]);

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      // Oppdater profil
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 2,
          trading_experience: selected,
        })
        .eq("user_id" as unknown, user.id);

      if (error) throw error;

      router.push(`/${locale}/onboarding/step3-trading-mode`);
    } catch (err) {
      console.error("Failed to save experience:", err);
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {EXPERIENCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {t(`options.${option.value}.label`)}
                </p>
                <p className="text-sm text-slate-500">
                  {t(`options.${option.value}.description`)}
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <Button
        onClick={handleContinue}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
        disabled={!selected || loading}
      >
        {loading ? t("loading") : t("cta")}
      </Button>
    </div>
  );
}
