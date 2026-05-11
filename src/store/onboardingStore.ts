import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type UIRiskLevel,
  type ApiRiskLevel,
  mapUiToApiRiskLevel,
  mapApiToUiRiskLevel,
} from "@/lib/trading/risk-level-mapping";

/** @deprecated Use UIRiskLevel from @/lib/trading/risk-level-mapping */
type RiskLevel = UIRiskLevel;

/** Re-export for convenience */
export type { UIRiskLevel, ApiRiskLevel };
export { mapUiToApiRiskLevel, mapApiToUiRiskLevel };
type OnboardingStep = 1 | 2 | 3;

interface OnboardingState {
  step: OnboardingStep;
  riskLevel: UIRiskLevel | null;
  isComplete: boolean;
  isLoading: boolean;
  direction: number;
  isPriority: boolean;
  setIsPriority: (isPriority: boolean) => void;
  goToStep: (step: OnboardingStep) => void;
  /** Set UI risk level (safe/balanced/aggressive) */
  setRiskLevel: (level: UIRiskLevel) => void;
  /** Set API risk level (low/medium/high) - will be converted to UI level */
  setApiRiskLevel: (level: ApiRiskLevel) => void;
  /** Get API risk level (low/medium/high) - use when sending to backend */
  getApiRiskLevel: () => ApiRiskLevel | null;
  completeOnboarding: () => Promise<void>;
  skipToApp: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      step: 1,
      riskLevel: null,
      isComplete: false,
      isLoading: false,
      direction: 1,
      isPriority: false,
      setIsPriority: (isPriority) => set({ isPriority }),
      goToStep: (step) => {
        const currentStep = get().step;
        set({
          step,
          direction: step > currentStep ? 1 : -1,
        });
      },
      setRiskLevel: (riskLevel) => set({ riskLevel }),
      setApiRiskLevel: (apiLevel) => set({ riskLevel: mapApiToUiRiskLevel(apiLevel) }),
      getApiRiskLevel: () => {
        const { riskLevel } = get();
        return riskLevel ? mapUiToApiRiskLevel(riskLevel) : null;
      },
      skipToApp: () => set({ isComplete: true }),
      completeOnboarding: async () => {
        set({ isLoading: true });
        try {
          const { getSupabaseClient } = await import("@/lib/supabase/client");
          const supabase = getSupabaseClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            await supabase.auth.updateUser({
              data: {
                onboarding_complete: true,
                onboarding_version: "v1",
                risk_level: get().riskLevel,
                onboarding_completed_at: new Date().toISOString(),
              },
            });
          }
          set({ isComplete: true });
        } finally {
          set({ isLoading: false });
        }
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
