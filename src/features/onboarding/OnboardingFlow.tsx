"use client";

import { useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useOnboardingStore } from "@/store/onboardingStore";
import { OnboardingStep1 } from "./steps/OnboardingStep1";
import { OnboardingStep2 } from "./steps/OnboardingStep2";
import { OnboardingStep3 } from "./steps/OnboardingStep3";
import { OnboardingProgress } from "./OnboardingProgress";

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.95,
  }),
};

const transition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
};

export function OnboardingFlow() {
  const { step, isComplete, direction, goToStep, skipToApp } =
    useOnboardingStore();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.user_metadata?.onboarding_complete) {
          skipToApp();
        }
      } catch {
        // Silent fail
      }
    };

    checkOnboardingStatus();
  }, [skipToApp]);

  if (isComplete) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0b0d]"
      role="dialog"
      aria-modal="true"
      aria-label="Kom i gang med Klarpakke"
    >
      <OnboardingProgress currentStep={step} totalSteps={3} />

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="absolute inset-0 flex flex-col"
          >
            {step === 1 && <OnboardingStep1 onNext={() => goToStep(2)} />}
            {step === 2 && (
              <OnboardingStep2
                onNext={() => goToStep(3)}
                onBack={() => goToStep(1)}
              />
            )}
            {step === 3 && <OnboardingStep3 />}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
