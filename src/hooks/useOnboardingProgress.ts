"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserContext,
  getActiveTip,
  OnboardingTip,
} from "@/lib/onboarding/tips";

const DISMISSED_KEY = "kp_onboarding_dismissed";
const CONTEXT_KEY = "kp_user_context";

interface DismissedState {
  [tipId: string]: boolean;
}

interface UseOnboardingProgressReturn {
  activeTip: OnboardingTip | null;
  dismissedTips: DismissedState;
  userContext: UserContext;
  dismissTip: (tipId: string) => void;
  getUserContext: () => UserContext;
  updateUserContext: (updates: Partial<UserContext>) => void;
  isLoading: boolean;
}

const DEFAULT_CONTEXT: UserContext = {
  hasTraded: false,
  tradeCount: 0,
  hasAutoTrade: false,
};

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedTips, setDismissedTips] = useState<DismissedState>({});
  const [userContext, setUserContext] = useState<UserContext>(DEFAULT_CONTEXT);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const dismissedRaw = localStorage.getItem(DISMISSED_KEY);
      const contextRaw = localStorage.getItem(CONTEXT_KEY);

      if (dismissedRaw) {
        setDismissedTips(JSON.parse(dismissedRaw));
      }
      if (contextRaw) {
        setUserContext({ ...DEFAULT_CONTEXT, ...JSON.parse(contextRaw) });
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get active tip based on user context, excluding dismissed tips
  const activeTip = (() => {
    const tip = getActiveTip(userContext);
    if (!tip) return null;
    if (dismissedTips[tip.id]) return null;
    return tip;
  })();

  const dismissTip = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const updated = { ...prev, [tipId]: true };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
        } catch {
          // Ignore localStorage errors
        }
      }
      return updated;
    });
  }, []);

  const getUserContext = useCallback((): UserContext => {
    return userContext;
  }, [userContext]);

  const updateUserContext = useCallback((updates: Partial<UserContext>) => {
    setUserContext((prev) => {
      const updated = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CONTEXT_KEY, JSON.stringify(updated));
        } catch {
          // Ignore localStorage errors
        }
      }
      return updated;
    });
  }, []);

  return {
    activeTip,
    dismissedTips,
    userContext,
    dismissTip,
    getUserContext,
    updateUserContext,
    isLoading,
  };
}
