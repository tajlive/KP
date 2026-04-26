"use client";

import { useMemo } from "react";

export type UserState = "NyBruker" | "Onboarded" | "AktivTrader" | "PowerUser";

export interface UserStateInput {
  tradesCount: number;
  signupDays: number;
  totalPnlPct: number;
}

export interface UserStateResult {
  state: UserState;
  tradesCount: number;
  signupDays: number;
  totalPnlPct: number;
}

/**
 * Compute adaptive user state based on trading activity and tenure.
 *
 * State machine:
 * - NyBruker:     0 trades OR signup < 7 days
 * - Onboarded:    1–4 trades AND signup ≥ 7 days
 * - AktivTrader:  5–49 trades AND signup ≥ 7 days AND P&L ≤ 10%
 * - PowerUser:    50+ trades OR P&L > 10%
 */
export function computeUserState(input: UserStateInput): UserStateResult {
  const { tradesCount, signupDays, totalPnlPct } = input;

  if (tradesCount === 0 || signupDays < 7) {
    return { state: "NyBruker", tradesCount, signupDays, totalPnlPct };
  }

  if (tradesCount >= 50 || totalPnlPct > 10) {
    return { state: "PowerUser", tradesCount, signupDays, totalPnlPct };
  }

  if (tradesCount >= 5 && signupDays >= 7) {
    return { state: "AktivTrader", tradesCount, signupDays, totalPnlPct };
  }

  return { state: "Onboarded", tradesCount, signupDays, totalPnlPct };
}

/**
 * Hook wrapper for computeUserState.
 * Use when you already have metrics + profile data fetched elsewhere.
 */
export function useUserState(input: UserStateInput | null): UserStateResult {
  return useMemo(() => {
    if (!input) {
      // Fallback — assume active trader so we don't show "new user" UI to logged-in users
      return { state: "AktivTrader", tradesCount: 0, signupDays: 0, totalPnlPct: 0 };
    }
    return computeUserState(input);
  }, [input]);
}
