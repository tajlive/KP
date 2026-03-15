"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getProfileOnboardingExtended } from "@/lib/supabase/helpers";
import { Gamepad2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OnboardingStep3() {
  const t = useTranslations("onboarding.step3");
  const router = useRouter();
  const locale = useLocale();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [paperBalance, setPaperBalance] = useState<number>(10000);

  const steps = [
    `/${locale}/onboarding/step1-welcome`,
    `/${locale}/onboarding/step2-experience`,
    `/${locale}/onboarding/step3-trading-mode`,
    `/${locale}/onboarding/step4-binance`,
    `/${locale}/onboarding/step5-complete`,
  ];

  // Sjekk auth
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${locale}/login?next=/onboarding/step3-trading-mode`);
        return;
      }

      const { data: profile } = await getProfileOnboardingExtended(supabase, user.id);

      if (profile?.onboarding_completed) {
        router.push(`/${locale}/dashboard`);
        return;
      }

      // Redirect hvis brukeren er på feil steg
      if (!profile?.onboarding_step || profile.onboarding_step < 2) {
        router.push(steps[profile?.onboarding_step || 0]);
        return;
      }

      if (profile.onboarding_step > 2) {
        router.push(steps[profile.onboarding_step]);
        return;
      }

      // Vis eksisterende paper_balance hvis satt
      if (profile?.paper_balance) {
        setPaperBalance(Number(profile.paper_balance));
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

      // Oppdater profil med paper_balance hvis ikke satt
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 3,
          paper_balance: paperBalance,
        })
        .eq("user_id" as unknown, user.id);

      if (error) throw error;

      router.push(`/${locale}/onboarding/step4-binance`);
    } catch (err) {
      console.error("Failed to save:", err);
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
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>

        {/* Paper Trading Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center space-y-2 mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("paperTrading.title")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t("paperTrading.description")}
            </p>
          </div>

          {/* Balance Display */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center shadow-sm">
            <p className="text-sm text-slate-500 mb-1">
              {t("paperTrading.yourBalance")}
            </p>
            <p className="text-4xl font-bold text-slate-900 dark:text-white">
              {paperBalance.toLocaleString("nb-NO")} kr
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {t("paperTrading.virtual")}
            </p>
          </div>
        </div>

        {/* Info tooltip */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1 underline decoration-dotted">
              <Info className="w-4 h-4" />
              {t("whatIsPaperTrading")}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{t("paperTrading.tooltip")}</p>
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
      </div>
    </TooltipProvider>
  );
}
