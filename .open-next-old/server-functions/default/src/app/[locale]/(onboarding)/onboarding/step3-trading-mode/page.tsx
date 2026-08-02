"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { m, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { RiskBadge } from "@/shared/ui/RiskBadge";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { Gamepad2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { OnboardingStickyFooter } from "@/features/onboarding/OnboardingStickyFooter";

export const dynamic = "force-dynamic";

const PAPER_START_BALANCE = 100_000;

export default function OnboardingStep3() {
  const t = useTranslations("onboarding.paperSetup");
  const locale = useLocale();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon — onboarding-state
        // hentes via server-API som leser httpOnly auth-cookie
        const res = await fetch("/api/user/onboarding", {
          credentials: "same-origin",
        });

        if (res.status === 401) {
          router.push(`${hrefWithLocale(locale, "/login")}?next=/${locale}/onboarding/step3-trading-mode`);
          return;
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error("Kunne ikke hente onboarding-state");
        const profile = json.onboarding;

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        if (step === 0) {
          router.push(`/${locale}/onboarding/step1-welcome`);
          return;
        }

        if (step === 1) {
          router.push(`/${locale}/onboarding/step2-level`);
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

        setInitializing(false);
      } catch (err) {
        console.error("Failed to load onboarding status:", err);
        setError(t("error"));
        setInitializing(false);
      }
    };

    checkStatus();
  }, [router, locale, t]);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_step: 3,
          paper_balance: PAPER_START_BALANCE,
        }),
      });

      if (!res.ok) throw new Error(t("error"));

      router.push(`/${locale}/onboarding/step4-first-trade`);
    } catch (err) {
      console.error("Failed to save paper setup:", err);
      setError(t("error"));
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div role="status" className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kp-brand" />
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <m.div
        className="min-h-full flex flex-col gap-6"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-kp-text-primary">
            {t("title")}
          </h1>
          <p className="text-kp-text-secondary">{t("subtitle")}</p>
        </div>

        {/* Paper Trading Card */}
        <Card className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6 gap-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-kp-brand rounded-2xl flex items-center justify-center shadow-lg shadow-kp-brand/20">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-kp-text-primary">
                {t("badge")}
              </h2>
              <RiskBadge level="low" />
            </div>
            <p className="text-sm text-kp-text-secondary">
              {t("virtual")}
            </p>
          </div>

          {/* Balance Display */}
          <div className="bg-kp-bg-primary border border-kp-border rounded-xl p-6 text-center">
            <p className="text-sm text-kp-text-secondary mb-1">
              {t("balanceLabel")}
            </p>
            <AnimatedNumber
              value={PAPER_START_BALANCE}
              prefix=""
              suffix={t("currencySuffix")}
              decimals={0}
              className="text-4xl font-bold text-kp-text-primary"
            />
          </div>
        </Card>

        {/* Info tooltip */}
        <div className="flex items-center justify-center gap-2 text-sm text-kp-text-secondary">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1 underline decoration-dotted min-h-[44px]">
              <Info className="w-4 h-4" aria-hidden="true" />
              {t("whatIs")}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{t("tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {error && (
          <p role="alert" className="text-sm text-kp-danger text-center">
            {error}
          </p>
        )}

        <OnboardingStickyFooter>
          <Button
            onClick={handleContinue}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
            disabled={loading}
          >
            {loading ? t("loading") : t("cta")}
          </Button>
        </OnboardingStickyFooter>
      </m.div>
    </TooltipProvider>
  );
}
