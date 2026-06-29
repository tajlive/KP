"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { createClient } from "@/lib/supabase/client";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CheckCircle2, Loader2, Shield, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default function OnboardingStep5() {
  const t = useTranslations("onboarding.step5");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();
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
          router.push(
            `${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step5-complete`)}`
          );
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

        // Redirect hvis brukeren ikke er på riktig steg (5-stegs flyt)
        if (!profile?.onboarding_step || profile.onboarding_step < 1) {
          router.push(`/${locale}/onboarding/step1-welcome`);
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
  }, [router, supabase, locale]);

  const handleGoToDashboard = () => {
    setLoading(true);
    router.push(`/${locale}/dashboard`);
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kp-ai)]" />
        <p className="text-[var(--kp-text-secondary)]">{t("initializing")}</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      {/* Success Animation */}
      <div className="relative">
        <div
          className={`mx-auto w-24 h-24 bg-[var(--kp-success-bg)] rounded-full flex items-center justify-center ${
            prefersReducedMotion ? "" : "animate-in zoom-in duration-500"
          }`}
        >
          <CheckCircle2 className="w-12 h-12 text-[var(--kp-success)]" />
        </div>
        {/* Confetti effect (CSS) */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-ping"
                style={{
                  backgroundColor: [
                    "var(--kp-brand)",
                    "var(--kp-success)",
                    "var(--kp-warning)",
                    "var(--kp-negative)",
                    "var(--kp-learning)",
                    "var(--kp-ai)",
                  ][i],
                  transform: `rotate(${i * 60}deg) translateY(-40px)`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--kp-text-primary)]">
          {t("title")}
        </h1>
        <p className="text-lg text-[var(--kp-text-secondary)]">
          {t("subtitle")}
        </p>
      </div>

      {/* Summary Card */}
      <Card className="bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-6 gap-3 text-center">
        <p className="text-sm text-[var(--kp-text-secondary)] mb-2">{t("paperBalance")}</p>
        <AnimatedNumber
          value={paperBalance}
          suffix=" kr"
          decimals={0}
          className="text-3xl font-bold text-[var(--kp-text-primary)]"
        />
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--kp-success-bg)] text-[var(--kp-success)]">
            {t("botReady")}
          </span>
        </div>
      </Card>

      {/* Safety notice — builds trust with small savers */}
      <div className="bg-[var(--kp-brand-subtle)] border border-[var(--kp-border-brand)] rounded-xl p-4 w-full md:max-w-sm mx-auto text-left">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[var(--kp-brand)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[var(--kp-text-primary)]">
              {t("safetyNotice.title")}
            </p>
            <p className="text-sm text-[var(--kp-text-secondary)]">
              {t("safetyNotice.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div className="text-left space-y-3 w-full md:max-w-sm mx-auto">
        <div className="flex items-center gap-3 text-[var(--kp-text-secondary)]">
          <CheckCircle2 className="w-5 h-5 text-[var(--kp-success)] shrink-0" />
          <span>{t("features.paperTrading")}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--kp-text-secondary)]">
          <CheckCircle2 className="w-5 h-5 text-[var(--kp-success)] shrink-0" />
          <span>{t("features.strategies")}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--kp-text-secondary)]">
          <CheckCircle2 className="w-5 h-5 text-[var(--kp-success)] shrink-0" />
          <span>{t("features.analytics")}</span>
        </div>
      </div>

      {/* Next steps — clarity for first-time users */}
      <div className="text-left space-y-3 w-full md:max-w-sm mx-auto">
        <div className="flex items-center gap-2 text-[var(--kp-text-primary)] font-medium mb-3">
          <ListChecks className="w-5 h-5 text-[var(--kp-brand)]" />
          <span>{t("nextSteps.title")}</span>
        </div>
        <ol className="space-y-2">
          <li className="flex items-start gap-3 text-sm text-[var(--kp-text-secondary)]">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--kp-bg-tertiary)] text-[var(--kp-text-primary)] text-xs font-medium flex items-center justify-center">
              1
            </span>
            {t("nextSteps.step1")}
          </li>
          <li className="flex items-start gap-3 text-sm text-[var(--kp-text-secondary)]">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--kp-bg-tertiary)] text-[var(--kp-text-primary)] text-xs font-medium flex items-center justify-center">
              2
            </span>
            {t("nextSteps.step2")}
          </li>
          <li className="flex items-start gap-3 text-sm text-[var(--kp-text-secondary)]">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--kp-bg-tertiary)] text-[var(--kp-text-primary)] text-xs font-medium flex items-center justify-center">
              3
            </span>
            {t("nextSteps.step3")}
          </li>
        </ol>
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
