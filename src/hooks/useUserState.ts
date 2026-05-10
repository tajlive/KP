"use client";

import { useMemo } from "react";

export type UserState = "NyBruker" | "Onboarded" | "AktivTrader" | "PowerUser";

export interface UserStateInput {
  tradesCount: number;
  signupDays: number;
  totalPnlPct: number;
  sessionCount: number;
}

export interface UserStateResult {
  state: UserState;
  tradesCount: number;
  signupDays: number;
  totalPnlPct: number;
  sessionCount: number;
}

/**
 * Compute adaptive user state based on trading activity and tenure.
 *
 * State machine:
 * - NyBruker:     (0 trades AND 0 sessions) OR signup < 7 days
 *                 Note: if sessions > 0, we promote to Onboarded even if new.
 * - Onboarded:    1–4 trades OR sessions > 0
 * - AktivTrader:  5–49 trades AND signup ≥ 7 days AND P&L ≤ 10%
 * - PowerUser:    50+ trades OR P&L > 10%
 */
export function computeUserState(input: UserStateInput): UserStateResult {
  const { tradesCount, signupDays, totalPnlPct, sessionCount } = input;

  // New user is someone with no trades, no sessions AND who is new.
  // If they have a session, they are already "onboarded" into the app.
  if ((tradesCount === 0 && sessionCount === 0) || (signupDays < 7 && sessionCount === 0)) {
    return { state: "NyBruker", tradesCount, signupDays, totalPnlPct, sessionCount };
  }

  if (tradesCount >= 50 || totalPnlPct > 10) {
    return { state: "PowerUser", tradesCount, signupDays, totalPnlPct, sessionCount };
  }

  if (tradesCount >= 5 && signupDays >= 7) {
    return { state: "AktivTrader", tradesCount, signupDays, totalPnlPct, sessionCount };
  }

  return { state: "Onboarded", tradesCount, signupDays, totalPnlPct, sessionCount };
}

/**
 * Hook wrapper for computeUserState.
 * Use when you already have metrics + profile data fetched elsewhere.
 */
export function useUserState(input: UserStateInput | null): UserStateResult {
  return useMemo(() => {
    if (!input) {
      // Fallback — assume active trader so we don't show "new user" UI to logged-in users
      return { state: "AktivTrader", tradesCount: 0, signupDays: 0, totalPnlPct: 0, sessionCount: 0 };
    }
    return computeUserState(input);
  }, [input]);
}
