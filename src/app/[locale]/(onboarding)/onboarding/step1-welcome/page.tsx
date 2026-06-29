"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { hrefWithLocale } from "@/i18n/href-with-locale";
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Check auth and onboarding status
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step1-welcome`)}`,
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
    setSaving(true);
    setError(null);

    try {
      localStorage.setItem("kp-onboarding-answers", JSON.stringify(answers));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step1-welcome`)}`,
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 1,
          onboarding_started_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      router.push(`/${locale}/onboarding/step2-level`);
    } catch (err) {
      console.error("Failed to save onboarding step 1:", err);
      setError(t("error.saveFailed"));
    } finally {
      setSaving(false);
    }
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

      {error && (
        <div className="rounded-xl border border-kp-danger/20 bg-kp-danger-bg p-4 text-center" role="alert">
          <p className="text-sm text-kp-danger">{error}</p>
          <p className="text-xs text-kp-text-secondary mt-1">{t("error.retryHint")}</p>
        </div>
      )}

      <p className="text-center text-sm text-kp-text-secondary">
        {t("timeEstimate")}
      </p>
    </div>
  );
}
