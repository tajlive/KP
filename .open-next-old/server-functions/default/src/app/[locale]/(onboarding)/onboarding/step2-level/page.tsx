"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { OnboardingStickyFooter } from "@/features/onboarding/OnboardingStickyFooter";
import { Wallet, TrendingUp, Target, Rocket, ChevronRight, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type CapitalOption = 10000 | 50000 | 100000;

interface CapitalLevel {
  value: CapitalOption;
  icon: typeof Wallet;
  gradient: string;
  label: string;
  desc: string;
  goal: string;
  badge: string;
}

const CAPITAL_OPTIONS: CapitalLevel[] = [
  {
    value: 10000,
    icon: Wallet,
    gradient: "from-emerald-500/20 to-emerald-600/10",
    label: "10 000 kr",
    desc: "Prøv å trade med et lite beløp — lær grunnleggende mekanikk helt risikofritt",
    goal: "✅ Mål: Forstå kjøp/salg og markedsbevegelser",
    badge: "Anbefalt for nybegynnere",
  },
  {
    value: 50000,
    icon: Target,
    gradient: "from-amber-500/20 to-amber-600/10",
    label: "50 000 kr",
    desc: "Mer kapital til å spre risiko over flere handler — som en ekte sparekonto",
    goal: "✅ Mål: Bygg portefølje og lær risikostyring",
    badge: "Balansert",
  },
  {
    value: 100000,
    icon: Rocket,
    gradient: "from-rose-500/20 to-rose-600/10",
    label: "100 000 kr",
    desc: "Full portefølje for aktiv trading — maksimal læring for deg som vil satse",
    goal: "✅ Mål: Aktiv porteføljeforvaltning",
    badge: "Avansert",
  },
];

export default function OnboardingStep2Level() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<CapitalOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon — onboarding-state
        // hentes via server-API som leser httpOnly auth-cookie
        const res = await fetch("/api/user/onboarding", {
          credentials: "same-origin",
        });
        if (res.status === 401) {
          router.push(`${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step2-level`)}`);
          return;
        }
        const json = await res.json().catch(() => null);
        const profile = json?.onboarding;

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        // 3-stegs flyt: step 0 = velkommen, step 1 = nivå, step 2 = trade
        if (step === 0) {
          router.push(`/${locale}/onboarding/step1-welcome`);
          return;
        }
        if (step >= 2) {
          router.push(`/${locale}/onboarding/step4-first-trade`);
          return;
        }

        // Gjenopprett tidligere valg
        const saved = profile?.paper_balance;
        if (saved && [10000, 50000, 100000].includes(saved)) {
          setSelected(saved as CapitalOption);
        }

        if (mounted) setChecking(false);
      } catch {
        if (mounted) setChecking(false);
      }
    };
    checkStatus();
    return () => { mounted = false; };
  }, [router, locale]);

  const handleContinue = async () => {
    if (!selected || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_balance: selected,
          onboarding_step: 2,
        }),
      });

      if (!res.ok) throw new Error("Lagring feilet");

      router.push(`/${locale}/onboarding/step4-first-trade`);
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
      {/* Progress: 2/3 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#9CA3AF] font-medium">Steg 2 av 3</span>
          <span className="text-[#6B7280]">Velg startkapital</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1A1D26] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#FCD34D] to-[#F59E0B]"
            initial={{ width: "33%" }}
            animate={{ width: "66%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#FCD34D]/10 border border-[#F59E0B]/20 mb-1">
          <Wallet className="w-7 h-7 text-[#F59E0B]" />
        </div>
        <h1 className="text-2xl font-bold text-[#F9FAFB]">
          Hvor mye vil du trade for?
        </h1>
        <p className="text-[#9CA3AF] text-sm max-w-sm mx-auto">
          Velg startkapital for lekepenger — du kan justere når som helst
        </p>
      </div>

      {/* Kapitalalternativer */}
      <div className="space-y-3">
        {CAPITAL_OPTIONS.map((option, i) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: "easeOut" }}
              onClick={() => {
                setSelected(option.value);
                navigator.vibrate?.(10);
              }}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? "border-[#F59E0B]/50 bg-gradient-to-br from-[#F59E0B]/10 to-[#FCD34D]/5 shadow-lg shadow-[#F59E0B]/5"
                  : "border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-xl hover:border-[#3A3D45]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-[#F9FAFB]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-lg font-bold text-[#F9FAFB]">{option.label}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 rounded-full px-2 py-0.5">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{option.desc}</p>
                  <p className="text-xs text-[#F59E0B]/80 mt-2">{option.goal}</p>
                </div>
                <div
                  className={`flex-shrink-0 mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#4B5563]"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[#0A0B0D] text-xs font-bold"
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

      {/* Forklaringstekst */}
      <div className="bg-[#1A1D26]/40 backdrop-blur-xl border border-[#2A2D35] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#F9FAFB]">Dette er lekepenger</p>
            <p className="text-xs text-[#6B7280] mt-1">
              Ingen ekte penger er i spill. Du øver og lærer i et trygt miljø — akkurat som i en flysimulator.
              Når du er klar, kan du oppgradere til ekte trading.
            </p>
          </div>
        </div>
      </div>

      <OnboardingStickyFooter>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push(`/${locale}/onboarding/step1-welcome`)}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl border border-[#2A2D35] text-[#9CA3AF] hover:bg-[#1A1D26]"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selected || loading}
            loading={loading}
            className="flex-[2] h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-[#0A0B0D] hover:from-[#D97706] hover:to-[#F59E0B] active:scale-[0.98] transition-all shadow-lg shadow-[#F59E0B]/20"
          >
            {loading ? "Lagrer..." : (
              <span className="flex items-center justify-center gap-2">
                Fortsett <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </OnboardingStickyFooter>
    </div>
  );
}
