"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = 0 | 1 | 2;
export type RiskLevel = "safe" | "balanced" | "aggressive";

interface OnboardingState {
  step: OnboardingStep;
  riskLevel: RiskLevel | null;
  isComplete: boolean;
  isVisible: boolean;
}

interface OnboardingActions {
  nextStep: () => void;
  prevStep: () => void;
  setRiskLevel: (level: RiskLevel) => void;
  complete: () => void;
  skip: () => void;
  reset: () => void;
  show: () => void;
}

const initialState: OnboardingState = {
  step: 0,
  riskLevel: null,
  isComplete: false,
  isVisible: true,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      nextStep: () => {
        const { step } = get();
        if (step < 2) {
          set({ step: (step + 1) as OnboardingStep });
        }
        if (step === 2) {
          set({ isComplete: true });
        }
      },

      prevStep: () => {
        const { step } = get();
        if (step > 0) {
          set({ step: (step - 1) as OnboardingStep });
        }
      },

      setRiskLevel: (level: RiskLevel) => {
        set({ riskLevel: level });
      },

      complete: () => {
        set({ isComplete: true, isVisible: false });
      },

      skip: () => {
        set({ isComplete: true, isVisible: false });
      },

      reset: () => {
        set(initialState);
      },

      show: () => {
        set({ isVisible: true });
      },
    }),
    {
      name: "klarpakke-onboarding",
      partialize: (state) => ({
        isComplete: state.isComplete,
        riskLevel: state.riskLevel,
      }),
    }
  )
);
