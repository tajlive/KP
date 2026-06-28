"use client";

export const dynamic = "force-dynamic";

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

  // Check auth and onboarding status
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/${locale}/innlogging?next=${encodeURIComponent(`/${locale}/onboarding/step1-welcome`)}`,
        );
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_step, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push(`/${locale}/dashboard`);
        return;
      }

      const step = profile?.onboarding_step ?? 0;
      if (step === 1) {
        router.push(`/${locale}/onboarding/step2-level`);
        return;
      }
      if (step === 2) {
        router.push(`/${locale}/onboarding/step3-trading-mode`);
        return;
      }
      if (step === 3) {
        router.push(`/${locale}/onboarding/step4-first-trade`);
        return;
      }
      if (step === 4) {
        router.push(`/${locale}/onboarding/step5-complete`);
        return;
      }
      if (step >= 5) {
        router.push(`/${locale}/dashboard`);
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-kp-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AIMappingChat onComplete={handleComplete} onSkip={handleSkip} />

      <p className="text-center text-sm text-kp-text-secondary">
        {t("timeEstimate")}
      </p>
    </div>
  );
}
