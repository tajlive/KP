"use client";

/**
 * OnboardingContainer — Full-screen iOS-style wizard
 * iPhone 15+ optimized with spring animations, haptic-ready progress bar.
 */

import type { OnboardingStep } from "@/store/onboarding-store";
import { STEP_ORDER, useOnboardingStore } from "@/store/onboarding-store";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { useEffect } from "react";
import { ApiSetupStep } from "./steps/ApiSetupStep";
import { CompletionStep } from "./steps/CompletionStep";
import { FirstPaperTradeStep } from "./steps/FirstPaperTradeStep";
import { RiskProfileStep } from "./steps/RiskProfileStep";
import { StrategyTemplateStep } from "./steps/StrategyTemplateStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const STEP_COMPONENTS: Record<OnboardingStep, React.ComponentType> = {
  welcome: WelcomeStep,
  risk_profile: RiskProfileStep,
  strategy_selection: StrategyTemplateStep,
  api_setup: ApiSetupStep,
  first_paper_trade: FirstPaperTradeStep,
  completion: CompletionStep,
};

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Velkommen",
  risk_profile: "Risikoprofil",
  strategy_selection: "Velg strategi",
  api_setup: "API-tilkobling",
  first_paper_trade: "Første trade",
  completion: "Ferdig!",
};

export default function OnboardingContainer() {
  const {
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    canGoNext,
    progressPercent,
    stepIndex,
    loadProgress,
    saveProgress,
  } = useOnboardingStore();

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Auto-save on step change
  useEffect(() => {
    saveProgress();
  }, [currentStep, saveProgress]);

  const StepComponent = STEP_COMPONENTS[currentStep];
  const progress = progressPercent();
  const idx = stepIndex();
  const isFirst = idx === 0;
  const isLast = currentStep === "completion";
  const shouldReduce = useReducedMotion();

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#0A0A0A] overflow-hidden flex flex-col">
      {/* Subtle aurora background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/3 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,12px)] pb-3">
        {!isFirst ? (
          <button
            onClick={previousStep}
            className="p-2 -ml-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-colors duration-200"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}

        {/* Step indicator dots */}
        <div className="flex items-center gap-1.5">
          {STEP_ORDER.map((step, i) => (
            <div
              key={step}
              className={`rounded-full transition-all duration-500 ${
                i === idx
                  ? "w-6 h-2 bg-linear-to-r from-cyan-500 to-blue-500"
                  : i < idx || completedSteps.includes(step)
                    ? "w-2 h-2 bg-blue-500"
                    : "w-2 h-2 bg-gray-300 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <button
          className="p-2 -mr-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-colors duration-200"
          aria-label="Lukk onboarding"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="relative z-10 h-0.5 bg-gray-200/50 dark:bg-gray-800/50"
        role="progressbar"
        ref={(el) => {
          if (el) {
            el.setAttribute("aria-valuenow", String(progress || 0));
            el.setAttribute("aria-valuemin", "0");
            el.setAttribute("aria-valuemax", "100");
          }
        }}
        aria-label="Onboarding-fremgang"
      >
        <motion.div
          className="h-full bg-linear-to-r from-cyan-500 via-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={
            shouldReduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 20 }
          }
        />
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={
              shouldReduce ? {} : { opacity: 0, x: 80, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={
              shouldReduce ? {} : { opacity: 0, x: -80, filter: "blur(4px)" }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 30 }
            }
            className="min-h-full"
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      {!isLast && (
        <div
          className="relative z-10 px-5 pb-[max(env(safe-area-inset-bottom,16px),16px)] pt-4
                     bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl
                     border-t border-gray-200/50 dark:border-gray-800/50"
        >
          {/* Step label */}
          <p className="text-[13px] text-gray-500 dark:text-gray-500 text-center mb-3 font-medium">
            {STEP_LABELS[currentStep]} · {idx + 1} av {STEP_ORDER.length}
          </p>

          <button
            onClick={nextStep}
            disabled={!canGoNext()}
            className="w-full min-h-[56px] px-6
                       bg-linear-to-r from-cyan-500 via-blue-500 to-indigo-500
                       text-white font-semibold text-[17px]
                       rounded-2xl
                       shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                       hover:shadow-[0_6px_24px_rgba(59,130,246,0.4)]
                       active:scale-[0.97]
                       transition-[transform,box-shadow,opacity] duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {currentStep === "api_setup" ? "Hopp over eller Neste" : "Neste"}
          </button>
        </div>
      )}
    </div>
  );
}
