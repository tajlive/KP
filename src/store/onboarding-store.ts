import { createClient } from "@/lib/supabase/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type OnboardingStep =
  | "welcome"
  | "risk_profile"
  | "strategy_selection"
  | "api_setup"
  | "first_paper_trade"
  | "completion";

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "risk_profile",
  "strategy_selection",
  "api_setup",
  "first_paper_trade",
  "completion",
];

type RiskLevel = "conservative" | "balanced" | "aggressive";

interface PaperTradeResult {
  symbol: string;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  timestamp: string;
}

interface OnboardingStore {
  // State
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  riskProfile: RiskLevel | null;
  selectedTemplate: string | null;
  paperTradeResult: PaperTradeResult | null;
  isCompleted: boolean;
  isSaving: boolean;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: OnboardingStep) => void;
  canGoNext: () => boolean;

  // Data setters
  setRiskProfile: (risk: RiskLevel) => void;
  setSelectedTemplate: (template: string) => void;
  setPaperTradeResult: (result: PaperTradeResult) => void;
  markStepComplete: (step: OnboardingStep) => void;

  // Persistence
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  resetOnboarding: () => void;

  // Derived
  progressPercent: () => number;
  stepIndex: () => number;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      currentStep: "welcome",
      completedSteps: [],
      riskProfile: null,
      selectedTemplate: null,
      paperTradeResult: null,
      isCompleted: false,
      isSaving: false,

      nextStep: () => {
        const { currentStep, completedSteps } = get();
        const idx = STEP_ORDER.indexOf(currentStep);

        // Mark current step as complete
        const updatedCompleted = completedSteps.includes(currentStep)
          ? completedSteps
          : [...completedSteps, currentStep];

        if (idx < STEP_ORDER.length - 1) {
          const nextStep = STEP_ORDER[idx + 1];
          set({
            currentStep: nextStep,
            completedSteps: updatedCompleted,
            isCompleted: nextStep === "completion",
          });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const idx = STEP_ORDER.indexOf(currentStep);
        if (idx > 0) {
          set({ currentStep: STEP_ORDER[idx - 1] });
        }
      },

      setStep: (step) => set({ currentStep: step }),

      canGoNext: () => {
        const { currentStep, riskProfile, selectedTemplate } = get();
        switch (currentStep) {
          case "welcome":
            return true;
          case "risk_profile":
            return riskProfile !== null;
          case "strategy_selection":
            return selectedTemplate !== null;
          case "api_setup":
            return true; // Optional step
          case "first_paper_trade":
            return true; // Can skip
          case "completion":
            return false;
          default:
            return true;
        }
      },

      setRiskProfile: (risk) => set({ riskProfile: risk }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setPaperTradeResult: (result) => set({ paperTradeResult: result }),

      markStepComplete: (step) => {
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        }));
      },

      saveProgress: async () => {
        const state = get();
        set({ isSaving: true });
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) return;

          await fetch("/api/onboarding/progress", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              currentStep: state.currentStep,
              completedSteps: state.completedSteps,
              riskProfile: state.riskProfile,
              selectedTemplate: state.selectedTemplate,
              paperTradeCompleted: state.paperTradeResult !== null,
            }),
          });
        } catch {
          // Silent — local persistence is the fallback
        } finally {
          set({ isSaving: false });
        }
      },

      loadProgress: async () => {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) return;

          const res = await fetch("/api/onboarding/progress", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.progress) {
            set({
              currentStep: data.progress.current_step || "welcome",
              completedSteps: data.progress.completed_steps || [],
              riskProfile: data.progress.risk_profile || null,
              selectedTemplate: data.progress.selected_template || null,
              isCompleted: data.progress.completed_at !== null,
            });
          }
        } catch {
          // Use local persistence
        }
      },

      resetOnboarding: () =>
        set({
          currentStep: "welcome",
          completedSteps: [],
          riskProfile: null,
          selectedTemplate: null,
          paperTradeResult: null,
          isCompleted: false,
        }),

      progressPercent: () => {
        const { completedSteps } = get();
        return Math.round((completedSteps.length / STEP_ORDER.length) * 100);
      },

      stepIndex: () => STEP_ORDER.indexOf(get().currentStep),
    }),
    {
      name: "klarpakke-onboarding",
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        riskProfile: state.riskProfile,
        selectedTemplate: state.selectedTemplate,
        isCompleted: state.isCompleted,
      }),
    },
  ),
);

export { STEP_ORDER };
export type { OnboardingStep, PaperTradeResult, RiskLevel };
