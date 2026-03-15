"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Bot, Clock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingStep1() {
  const t = useTranslations("onboarding.step1");
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

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
        .select("onboarding_step, onboarding_completed")
        .eq("user_id" as unknown, user.id)
        .single() as unknown;

      if (profile?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      // Hvis brukeren allerede er på et senere steg, redirect dit
      if (profile?.onboarding_step && profile.onboarding_step > 0) {
        const steps = [
          "/onboarding/step1-welcome",
          "/onboarding/step2-experience",
          "/onboarding/step3-trading-mode",
          "/onboarding/step4-binance",
          "/onboarding/step5-complete",
        ];
        router.push(steps[profile.onboarding_step] || steps[0]);
        return;
      }

      setChecking(false);
    };

    checkStatus();
  }, [router, supabase]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      // Oppdater onboarding_step til 1
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 1,
          onboarding_started_at: new Date().toISOString(),
        })
        .eq("user_id" as unknown, user.id);

      if (error) throw error;

      router.push("/onboarding/step2-experience");
    } catch (err) {
      console.error("Failed to start onboarding:", err);
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

  return (
    <div className="text-center space-y-8">
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
          disabled={loading}
        >
          {loading ? t("loading") : t("cta")}
        </Button>
        <p className="text-sm text-slate-500">{t("timeEstimate")}</p>
      </div>
    </div>
  );
}
