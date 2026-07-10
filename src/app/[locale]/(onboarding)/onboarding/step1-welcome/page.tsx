"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { createClient } from "@/lib/supabase/client";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { OnboardingStickyFooter } from "@/features/onboarding/OnboardingStickyFooter";
import { Sparkles, BookOpen, Zap, Trophy, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

type ExperienceLevel = "nybegynner" | "litt-erfaring" | "erfaren";

const LEVELS: Array<{
  key: ExperienceLevel;
  icon: typeof BookOpen;
  color: string;
  accent: string;
}> = [
  { key: "nybegynner", icon: BookOpen, color: "from-emerald-500/20 to-emerald-600/10", accent: "#10B981" },
  { key: "litt-erfaring", icon: Zap, color: "from-amber-500/20 to-amber-600/10", accent: "#F59E0B" },
  { key: "erfaren", icon: Trophy, color: "from-rose-500/20 to-rose-600/10", accent: "#EF4444" },
];

export default function OnboardingStep1Welcome() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<ExperienceLevel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(`${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step1-welcome`)}`);
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_step, onboarding_completed, trading_experience")
          .eq("id", user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        // 3-stegs flyt: step 0 = velkommen, step 1 = nivå, step 2 = første trade
        if (step >= 2) {
          router.push(`/${locale}/onboarding/step4-first-trade`);
          return;
        }
        if (step >= 1) {
          router.push(`/${locale}/onboarding/step2-level`);
          return;
        }

        if (profile?.trading_experience) {
          setSelected(profile.trading_experience as ExperienceLevel);
        }

        if (mounted) setChecking(false);
      } catch {
        if (mounted) setChecking(false);
      }
    };
    checkStatus();
    return () => { mounted = false; };
  }, [router, supabase, locale]);

  const handleContinue = async () => {
    if (!selected || loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          trading_experience: selected,
          onboarding_step: 1,
          onboarding_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      router.push(`/${locale}/onboarding/step2-level`);
    } catch {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#F59E0B]" />
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col gap-8">
      {/* Progress: 1/3 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#9CA3AF] font-medium">Steg 1 av 3</span>
          <span className="text-[#6B7280]">Velkommen</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1A1D26] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#FCD34D] to-[#F59E0B]"
            initial={{ width: "0%" }}
            animate={{ width: "33%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Velkomstmelding */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#FCD34D]/10 border border-[#F59E0B]/20 mb-2">
          <Sparkles className="w-8 h-8 text-[#F59E0B]" />
        </div>
        <h1 className="text-3xl font-bold text-[#F9FAFB] leading-tight">
          Velkommen til Klarpakke
        </h1>
        <p className="text-[#9CA3AF] text-base leading-relaxed max-w-sm mx-auto">
          Lær å handle krypto med lekepenger — helt uten risiko. Først, fortell oss hvor du står.
        </p>
      </div>

      {/* Erfaringsnivå */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider text-center">
          Ditt erfaringsnivå
        </h2>

        {LEVELS.map((level, i) => {
          const Icon = level.icon;
          const isSelected = selected === level.key;

          return (
            <motion.button
              key={level.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: "easeOut" }}
              onClick={() => {
                setSelected(level.key);
                navigator.vibrate?.(10);
              }}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? "border-[#F59E0B]/50 bg-gradient-to-br from-[#F59E0B]/10 to-[#FCD34D]/5 shadow-lg shadow-[#F59E0B]/5"
                  : "border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-xl hover:border-[#3A3D45]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-[#9CA3AF]"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold ${isSelected ? "text-[#F9FAFB]" : "text-[#F9FAFB]"}`}>
                    {level.key === "nybegynner" ? "Nybegynner" : level.key === "litt-erfaring" ? "Litt erfaring" : "Erfaren"}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-0.5">
                    {level.key === "nybegynner"
                      ? "Har aldri handlet krypto før — starter helt fra bunnen"
                      : level.key === "litt-erfaring"
                        ? "Har prøvd å handle litt, men vil lære mer"
                        : "Kjenner godt til krypto og vil trade aktivt"}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#4B5563]"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-white text-xs"
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <OnboardingStickyFooter>
        <Button
          onClick={handleContinue}
          disabled={!selected || loading}
          loading={loading}
          className="w-full h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-[#0A0B0D] hover:from-[#D97706] hover:to-[#F59E0B] active:scale-[0.98] transition-all shadow-lg shadow-[#F59E0B]/20"
        >
          {loading ? "Lagrer..." : (
            <span className="flex items-center justify-center gap-2">
              Fortsett <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </OnboardingStickyFooter>
    </div>
  );
}
