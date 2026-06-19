"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Bot, Clock, Shield, BookOpen, TrendingUp, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";


const EXPERIENCE_OPTIONS = [
  { value: "beginner", icon: BookOpen, color: "text-green-600" },
  { value: "intermediate", icon: TrendingUp, color: "text-blue-600" },
  { value: "expert", icon: Award, color: "text-purple-600" },
] as const;

export default function OnboardingStep1() {
  const t = useTranslations("onboarding.step1");
  const t2 = useTranslations("onboarding.step2");
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [showExperience, setShowExperience] = useState(false);

  // Sjekk auth og onboarding-status
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/onboarding");
        return;
      }

      // Sjekk om onboarding allerede er startet
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_step, onboarding_completed, trading_experience")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      // Hvis brukeren allerede har valgt erfaring, hopp til trading-mode
      if (profile?.trading_experience) {
        router.push("/onboarding/step3-trading-mode");
        return;
      }

      // Hvis brukeren er på et senere steg, redirect dit
      // NY: 3-stegs flyt mapping
      // DB step 0 = Nytt steg 1 (welcome) - blir her
      // DB step 1 = Nytt steg 2 (trading-mode)  
      // DB step >= 2 = Nytt steg 3 (complete)
      if (profile?.onboarding_step && profile.onboarding_step > 0) {
        if (profile.onboarding_step === 1) {
          router.push("/onboarding/step3-trading-mode");
          return;
        }
        if (profile.onboarding_step >= 2) {
          router.push("/onboarding/step5-complete");
          return;
        }
      }

      setChecking(false);
    };

    checkStatus();
  }, [router, supabase]);

  const handleStart = () => {
    setShowExperience(true);
  };

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      // Oppdater profil - går direkte til step 2 (trading-mode)
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 1,
          onboarding_started_at: new Date().toISOString(),
          trading_experience: selected,
        })
        .eq("id", user.id);

      if (error) throw error;

      router.push("/onboarding/step3-trading-mode");
    } catch (err) {
      console.error("Failed to save experience:", err);
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Step 1A: Velkomst
  if (!showExperience) {
    return (
      <div className="text-center space-y-8">
        {/* Progress bar - 3 steg totalt, vi er på steg 1 */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full w-1/3" />
        </div>

        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Bot className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {t("headline")}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Shield className="w-8 h-8 text-green-600" />
            <span className="text-sm font-medium">{t("features.safe")}</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-medium">{t("features.fast")}</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Bot className="w-8 h-8 text-purple-600" />
            <span className="text-sm font-medium">{t("features.auto")}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button
            onClick={handleStart}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {t("cta")}
          </Button>
          <p className="text-sm text-slate-500">{t("timeEstimate")}</p>
        </div>
      </div>
    );
  }

  // Step 1B: Erfaring (slått sammen fra step2)
  return (
    <div className="space-y-8">
      {/* Progress bar - 3 steg totalt, vi er på steg 1 */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
        <div className="bg-blue-600 h-full rounded-full w-1/3" />
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t2("title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">{t2("subtitle")}</p>
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
                  {t2(`options.${option.value}.label`)}
                </p>
                <p className="text-sm text-slate-500">
                  {t2(`options.${option.value}.description`)}
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
        {loading ? t2("loading") : t2("cta")}
      </Button>
    </div>
  );
}
