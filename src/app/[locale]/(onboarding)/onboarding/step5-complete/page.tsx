"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function OnboardingStep5() {
  const t = useTranslations("onboarding.step5");
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [paperBalance, setPaperBalance] = useState<number>(100000);
  const [sessionCreated, setSessionCreated] = useState(false);

  // Sjekk auth og fullfør onboarding
  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login?next=/onboarding/step5-complete");
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_step, onboarding_completed, paper_balance")
          .eq("id", user.id)
          .single();

        // Hvis allerede fullført, vis suksess
        if (profile?.onboarding_completed) {
          setPaperBalance(Number(profile.paper_balance) || 100000);
          setSessionCreated(true);
          setInitializing(false);
          return;
        }

        // Redirect hvis brukeren ikke er på riktig steg
        if (!profile?.onboarding_step || profile.onboarding_step < 4) {
          const steps = [
            "/onboarding/step1-welcome",
            "/onboarding/step2-experience",
            "/onboarding/step3-trading-mode",
            "/onboarding/step4-binance",
            "/onboarding/step5-complete",
          ];
          router.push(steps[profile?.onboarding_step || 0]);
          return;
        }

        setPaperBalance(Number(profile.paper_balance) || 100000);

        // Fullfør onboarding og opprett trading session
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Kunne ikke fullføre onboarding");
        }

        setSessionCreated(true);
        setInitializing(false);
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
        setInitializing(false);
      }
    };

    completeOnboarding();
  }, [router, supabase]);

  const handleGoToDashboard = () => {
    setLoading(true);
    router.push("/dashboard");
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500">{t("initializing")}</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      {/* Success Animation */}
      <div className="relative">
        <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        {/* Confetti effect (CSS) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][i],
                transform: `rotate(${i * 60}deg) translateY(-40px)`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Text */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-slate-500 mb-2">{t("paperBalance")}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {paperBalance.toLocaleString("nb-NO")} kr
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
            {t("botReady")}
          </span>
        </div>
      </div>

      {/* Features list */}
      <div className="text-left space-y-3 max-w-sm mx-auto">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span>{t("features.paperTrading")}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span>{t("features.strategies")}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span>{t("features.analytics")}</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handleGoToDashboard}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
        disabled={loading || !sessionCreated}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t("loading")}
          </>
        ) : (
          t("cta")
        )}
      </Button>
    </div>
  );
}
