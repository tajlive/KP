"use client";

import { Button } from "@/shared/ui/button";
import confetti from "canvas-confetti";
import { AnimatePresence, m } from "framer-motion";
import {
  Bitcoin,
  ChevronRight,
  Flame,
  PartyPopper,
  Shield,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
  Circle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { RiskDisclaimer } from "./RiskDisclaimer";
import { startTrading } from "@/app/actions/trading";
import { useCallback, useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Data
// ─────────────────────────────────────────────────────────────────────────────

interface RiskProfile {
  id:
    | "low"
    | "medium"
    | "high"
    | "safe"
    | "balanced"
    | "offensive"
    | "aggressive";
  name: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  dailyLoss: string;
  icon: typeof Shield;
  fillColor: string;
}

const getRiskProfiles = (t: (key: string) => string): RiskProfile[] => [
  {
    id: "safe",
    name: t("speedOnboarding.riskProfiles.safe.name"),
    color: "text-green-500",
    bg: "from-green-500/10 to-emerald-500/10",
    border: "border-green-400/40 hover:border-green-400",
    description: t("speedOnboarding.riskProfiles.safe.description"),
    dailyLoss: t("speedOnboarding.riskProfiles.safe.dailyLoss"),
    icon: Shield,
    fillColor: "fill-green-500",
  },
  {
    id: "balanced",
    name: t("speedOnboarding.riskProfiles.balanced.name"),
    color: "text-blue-500",
    bg: "from-blue-500/10 to-indigo-500/10",
    border: "border-blue-400/40 hover:border-blue-400",
    description: t("speedOnboarding.riskProfiles.balanced.description"),
    dailyLoss: t("speedOnboarding.riskProfiles.balanced.dailyLoss"),
    icon: TrendingUp,
    fillColor: "fill-blue-500",
  },
  {
    id: "offensive",
    name: t("speedOnboarding.riskProfiles.offensive.name"),
    color: "text-orange-500",
    bg: "from-orange-500/10 to-amber-500/10",
    border: "border-orange-400/40 hover:border-orange-400",
    description: t("speedOnboarding.riskProfiles.offensive.description"),
    dailyLoss: t("speedOnboarding.riskProfiles.offensive.dailyLoss"),
    icon: Flame,
    fillColor: "fill-orange-500",
  },
  {
    id: "aggressive",
    name: t("speedOnboarding.riskProfiles.aggressive.name"),
    color: "text-red-500",
    bg: "from-red-500/10 to-rose-500/10",
    border: "border-red-400/40 hover:border-red-400",
    description: t("speedOnboarding.riskProfiles.aggressive.description"),
    dailyLoss: t("speedOnboarding.riskProfiles.aggressive.dailyLoss"),
    icon: Zap,
    fillColor: "fill-red-500",
  },
];

const COINS = [
  {
    id: "BTC",
    name: "Bitcoin",
    emoji: "₿",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "ETH",
    name: "Ethereum",
    emoji: "Ξ",
    color: "from-blue-400 to-indigo-500",
  },
  {
    id: "SOL",
    name: "Solana",
    emoji: "◎",
    color: "from-emerald-400 to-emerald-500",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SpeedOnboarding({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedRisk, setSelectedRisk] = useState<
    | "low"
    | "medium"
    | "high"
    | "safe"
    | "balanced"
    | "offensive"
    | "aggressive"
    | null
  >(null);
  const [selectedCoins, setSelectedCoins] = useState<string[]>(["BTC"]);
  const [countdown, setCountdown] = useState(60);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (step === 0 || step >= 3) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const toggleCoin = useCallback((coinId: string) => {
    setSelectedCoins((prev) =>
      prev.includes(coinId)
        ? prev.length > 1
          ? prev.filter((c) => c !== coinId)
          : prev
        : [...prev, coinId],
    );
  }, []);

  async function handleStart() {
    if (!selectedRisk) return;
    setIsStarting(true);

    try {
      // KLA-auth: browser-klienten er alltid anon (httpOnly auth-cookie) —
      // getUser() ga alltid null, så hele denne blokka (inkl. startTrading)
      // ble hoppet over. Onboarding-status lagres via server-API.
      // user_trading_config-tabellen finnes ikke i prod — upserten er fjernet
      // (var allerede stille død). Persistens skjer i user_profiles.
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_completed: true,
          onboarding_step: 5,
          onboarding_completed_at: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        // Start paper trading session
        await startTrading({
          mode: "paper",
          strategy: "dca",
          risk_level: selectedRisk,
          pairs: selectedCoins.map((c) => `${c}USDT`),
        });
      }
    } catch {
      // Continue anyway — paper trading will work on next cron tick
    }

    setStep(3);
    setShowConfetti(true);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => {
      setShowConfetti(false);
      onComplete?.();
    }, 4000);
    setIsStarting(false);
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Timer Bar */}
      {step > 0 && step < 3 && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <Timer className="w-4 h-4 text-blue-500" />
          <div className="text-sm font-bold text-slate-500">
            {t("speedOnboarding.timerPrefix")}{" "}
            <span
              className={`${countdown < 15 ? "text-red-500" : "text-blue-500"}`}
            >
              {countdown}s
            </span>
          </div>
          <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <m.div
              className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${(countdown / 60) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                s === step
                  ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/30"
                  : s < step
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && (
              <div
                className={`w-8 h-0.5 transition-colors ${s < step ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Step 0: Risk Disclaimer ─── */}
        {step === 0 && (
          <m.div
            key="step0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <RiskDisclaimer onAccept={() => setStep(1)} locale={locale} />
          </m.div>
        )}

        {/* ─── Step 1: Risk Profile ─── */}
        {step === 1 && (
          <m.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">
              {t("speedOnboarding.step1.title")}
            </h3>
            <p className="text-center text-slate-500 mb-6 text-sm">
              {t("speedOnboarding.step1.subtitle")}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {getRiskProfiles(t).map((profile) => {
                const Icon = profile.icon;
                const isSelected = selectedRisk === profile.id;
                return (
                  <m.button
                    key={profile.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedRisk(profile.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? `${profile.border.split(" ")[0]} bg-linear-to-br ${profile.bg} shadow-lg`
                        : `border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50`
                    }`}
                  >
                    {isSelected && (
                      <m.div
                        layoutId="riskSelect"
                        className="absolute inset-0 rounded-2xl border-2 border-current opacity-50 pointer-events-none"
                        style={{
                          borderColor: profile.color.replace("text-", ""),
                        }}
                      />
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Circle
                        className={`w-4 h-4 ${profile.fillColor} ${profile.color}`}
                      />
                      <Icon className={`w-4 h-4 ${profile.color}`} />
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {profile.description}
                    </div>
                    <div
                      className={`text-[10px] font-bold mt-2 ${profile.color}`}
                    >
                      {profile.dailyLoss}
                    </div>
                  </m.button>
                );
              })}
            </div>

            <Button
              disabled={!selectedRisk}
              onClick={() => setStep(2)}
              className="w-full mt-6 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-base disabled:opacity-40 shadow-lg shadow-blue-600/25"
            >
              {tCommon("next")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </m.div>
        )}

        {/* ─── Step 2: Coins ─── */}
        {step === 2 && (
          <m.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">
              {t("speedOnboarding.step2.title")}
            </h3>
            <p className="text-center text-slate-500 mb-6 text-sm">
              {t("speedOnboarding.step2.subtitle")}
            </p>

            <div className="space-y-3">
              {COINS.map((coin) => {
                const isSelected = selectedCoins.includes(coin.id);
                return (
                  <m.button
                    key={coin.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleCoin(coin.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-linear-to-br ${coin.color} flex items-center justify-center text-white text-lg font-bold shadow-lg`}
                    >
                      {coin.emoji}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {coin.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {coin.id}/NOK
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </m.button>
                );
              })}
            </div>

            {/* Capital Display */}
            <div className="mt-6 p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800/50 text-center">
              <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">
                <Bitcoin className="w-3.5 h-3.5 inline mr-1" />
                {t("speedOnboarding.step2.startingCapital")}
              </div>
              <div className="text-3xl font-black text-green-600">
                100 000 <span className="text-lg">NOK</span>
              </div>
              <div className="text-[11px] text-green-500/80 mt-1">
                {t("speedOnboarding.step2.paperTradingZeroRisk")}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                {tCommon("back")}
              </Button>
              <Button
                onClick={handleStart}
                disabled={isStarting}
                className="flex-[2] h-12 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-green-500/30"
              >
                {isStarting ? (
                  <span className="animate-pulse">
                    {t("speedOnboarding.step2.starting")}
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("speedOnboarding.step2.startTrading")}
                  </>
                )}
              </Button>
            </div>
          </m.div>
        )}

        {/* ─── Step 3: Success! ─── */}
        {step === 3 && (
          <m.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="text-center py-8"
          >
            <m.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: 2, duration: 0.5 }}
              className="text-6xl mb-4"
            >
              <PartyPopper className="w-16 h-16 mx-auto text-amber-500" />
            </m.div>

            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              {t("speedOnboarding.step3.title")}
            </h3>
            <p className="text-slate-500 mb-6">
              {t("speedOnboarding.step3.line1")} <strong>100K NOK</strong>{" "}
              {t("speedOnboarding.step3.line2")}
              <br />
              {t("speedOnboarding.step3.line3")}
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => router.push(`/${locale}/handel?tab=auto`)}
                className="h-14 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-600/25"
              >
                {t("speedOnboarding.step3.goToDashboard")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(`/${locale}/handel?tab=auto`)}
                className="text-slate-500 text-sm"
              >
                {t("speedOnboarding.step3.viewActivity")}
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
