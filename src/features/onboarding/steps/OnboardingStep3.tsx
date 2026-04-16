"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const triggerConfetti = async () => {
  if (typeof window === "undefined") return;

  const { default: confetti } = await import("canvas-confetti");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) return;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#2563eb", "#3b82f6", "#60a5fa", "#ffffff"],
    disableForReducedMotion: true,
  });
};

function CheckmarkSVG() {
  return (
    <svg
      viewBox="0 0 52 52"
      fill="none"
      className="h-14 w-14"
      aria-hidden="true"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        stroke="#2563eb"
        strokeWidth="2.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.path
        d="M14 26l8 8 16-16"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

export function OnboardingStep3() {
  const t = useTranslations("onboarding");
  const { completeOnboarding, isLoading, riskLevel } = useOnboardingStore();
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerConfetti();
      navigator.vibrate?.([50, 30, 80]);
    }, 300);

    const buttonTimer = setTimeout(() => {
      setShowButton(true);
    }, 800);

    return () => {
      clearTimeout(timer);
      clearTimeout(buttonTimer);
    };
  }, []);

  const handleStart = async () => {
    navigator.vibrate?.([30, 20]);
    await completeOnboarding();
    router.replace("/dashboard");
  };

  return (
    <div className="flex h-full flex-col justify-between px-5 py-8">
      <div className="flex flex-col items-center gap-6 pt-16 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.1,
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2563eb]/10"
        >
          <CheckmarkSVG />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-2"
        >
          <h2 className="text-2xl font-bold text-white">{t("mobile.step3.title")}</h2>
          <p className="text-base text-white/60">
            {t("mobile.step3.description")}
          </p>
          {riskLevel && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-2 text-sm text-white/40"
            >
              {t("mobile.step3.selectedStrategy")}{" "}
              <span className="capitalize text-white/60">{riskLevel}</span>
            </motion.p>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <motion.button
              onClick={handleStart}
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-2xl bg-[#2563eb] py-4 text-base font-semibold text-white disabled:opacity-60"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  {t("mobile.step3.loading")}
                </span>
              ) : (
                t("mobile.step3.cta")
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
