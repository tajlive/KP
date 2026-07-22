"use client";

/**
 * Klient-helper for onboarding-funnel-events.
 * Fire-and-forget: feiler stille (tracking skal aldri blokkere UX).
 * Dedup i localStorage så samme event ikke sendes gjentatte ganger
 * fra samme enhet (server deduper i tillegg per bruker).
 */

export type OnboardingStep =
  | "checklist_viewed"
  | "first_trade_completed"
  | "history_viewed";

const STORAGE_PREFIX = "kp_ev_";

export function trackOnboardingStep(
  step: OnboardingStep,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  const storageKey = STORAGE_PREFIX + step;
  try {
    if (window.localStorage.getItem(storageKey) === "1") return;
  } catch {
    // localStorage utilgjengelig (privat modus) — track likevel, server deduper
  }

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // ignorer
  }

  try {
    void fetch("/api/onboarding/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, ...(metadata ? { metadata } : {}) }),
    }).catch(() => {
      // stille — tracking skal aldri krasje brukerflyt
    });
  } catch {
    // stille (f.eks. mocket fetch som returnerer undefined i tester)
  }
}
