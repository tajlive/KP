"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = 0 | 1 | 2;
import {
  type UIRiskLevel,
  type ApiRiskLevel,
  mapUiToApiRiskLevel,
  mapApiToUiRiskLevel,
} from "@/lib/trading/risk-level-mapping";

/** @deprecated Use UIRiskLevel from @/lib/trading/risk-level-mapping */
export type RiskLevel = UIRiskLevel;

/** Re-export for convenience */
export type { UIRiskLevel, ApiRiskLevel };
export { mapUiToApiRiskLevel, mapApiToUiRiskLevel };

interface OnboardingState {
  step: OnboardingStep;
  riskLevel: UIRiskLevel | null;
  isComplete: boolean;
  isVisible: boolean;
}

interface OnboardingActions {
  nextStep: () => void;
  prevStep: () => void;
  /** Set UI risk level (safe/balanced/aggressive) */
  setRiskLevel: (level: UIRiskLevel) => void;
  /** Set API risk level (low/medium/high) - will be converted to UI level */
  setApiRiskLevel: (level: ApiRiskLevel) => void;
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

      setRiskLevel: (level: UIRiskLevel) => {
        set({ riskLevel: level });
      },
      setApiRiskLevel: (level: ApiRiskLevel) => {
        set({ riskLevel: mapApiToUiRiskLevel(level) });
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
