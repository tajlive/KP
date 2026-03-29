import { create } from "zustand";
import { persist } from "zustand/middleware";

type RiskLevel = "safe" | "balanced" | "aggressive";
type OnboardingStep = 1 | 2 | 3;

interface OnboardingState {
  step: OnboardingStep;
  riskLevel: RiskLevel | null;
  isComplete: boolean;
  isLoading: boolean;
  direction: number;
  goToStep: (step: OnboardingStep) => void;
  setRiskLevel: (level: RiskLevel) => void;
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
      goToStep: (step) => {
        const currentStep = get().step;
        set({
          step,
          direction: step > currentStep ? 1 : -1,
        });
      },
      setRiskLevel: (riskLevel) => set({ riskLevel }),
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
