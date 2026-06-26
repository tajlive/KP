"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  AIMappingChat,
  AIMappingAnswers,
} from "@/features/onboarding/AIMappingChat";

export default function OnboardingStep1() {
  const t = useTranslations("onboarding.step1");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  // Sjekk auth og onboarding-status
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/${locale}/innlogging?next=${encodeURIComponent(`/${locale}/onboarding`)}`,
        );
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_step, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      if (profile?.onboarding_step && profile.onboarding_step >= 2) {
        router.push("/onboarding/step2-level");
        return;
      }

      setChecking(false);
    };

    checkStatus();
  }, [router, supabase, locale]);

  const handleComplete = async (answers: AIMappingAnswers) => {
    localStorage.setItem("kp-onboarding-answers", JSON.stringify(answers));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("user_profiles")
      .update({
        onboarding_step: 1,
        onboarding_started_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    router.push(`/${locale}/onboarding/step2-level`);
  };

  const handleSkip = () => {
    const defaultAnswers: AIMappingAnswers = {
      goal: "sparing",
      timeHorizon: "over3ar",
    };
    void handleComplete(defaultAnswers);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-b-2"
          style={{ borderColor: "var(--kp-ai)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar - 5 steg totalt, vi er på steg 1 */}
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: "var(--kp-bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: "20%", background: "var(--kp-ai)" }}
        />
      </div>

      <AIMappingChat onComplete={handleComplete} onSkip={handleSkip} />

      <p className="text-center text-sm" style={{ color: "var(--kp-text-muted)" }}>
        {t("timeEstimate")}
      </p>
    </div>
  );
}
