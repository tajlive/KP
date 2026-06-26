"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { m, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { RiskBadge } from "@/shared/ui/RiskBadge";
import { createClient } from "@/lib/supabase/client";
import { Gamepad2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

export const dynamic = "force-dynamic";

const PAPER_START_BALANCE = 100_000;

export default function OnboardingStep3() {
  const t = useTranslations("onboarding.paperSetup");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${locale}/innlogging?next=/${locale}/onboarding/step3-trading-mode`);
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
    };

    checkStatus();
  }, [router, supabase, locale]);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 3,
          paper_balance: PAPER_START_BALANCE,
        })
        .eq("id", user.id);

      if (error) throw error;

      router.push(`/${locale}/onboarding/step4-first-trade`);
    } catch (err) {
      console.error("Failed to save paper setup:", err);
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--kp-ai)]" />
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
          <h1 className="text-2xl font-bold text-[var(--kp-text-primary)]">
            {t("title")}
          </h1>
          <p className="text-[var(--kp-text-secondary)]">{t("subtitle")}</p>
        </div>

        {/* Paper Trading Card */}
        <Card className="bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-6 gap-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-[var(--kp-ai)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--kp-ai)]/20">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-[var(--kp-text-primary)]">
                {t("badge")}
              </h2>
              <RiskBadge level="low" />
            </div>
            <p className="text-sm text-[var(--kp-text-secondary)]">
              {t("virtual")}
            </p>
          </div>

          {/* Balance Display */}
          <div className="bg-[var(--kp-bg-primary)] border border-[var(--kp-border)] rounded-xl p-6 text-center">
            <p className="text-sm text-[var(--kp-text-secondary)] mb-1">
              {t("balanceLabel")}
            </p>
            <AnimatedNumber
              value={PAPER_START_BALANCE}
              prefix=""
              suffix=" kr"
              decimals={0}
              className="text-4xl font-bold text-[var(--kp-text-primary)]"
            />
          </div>
        </Card>

        {/* Info tooltip */}
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--kp-text-secondary)]">
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

        {/* CTA */}
        <Button
          onClick={handleContinue}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
          disabled={loading}
        >
          {loading ? t("loading") : t("cta")}
        </Button>
      </m.div>
    </TooltipProvider>
  );
}
