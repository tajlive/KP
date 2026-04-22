"use client";

import { useCallback } from "react";

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "none";

const PATTERNS: Record<Exclude<HapticPattern, "none">, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [20, 30, 20],   // pulse pattern — Perplexity 2026 best practice
  warning: [20, 30, 20],
  error: [30, 50, 30, 50, 30],
};

/**
 * iOS-specific haptic via webkit message handler (for PWAs / WKWebView).
 * Falls back to standard Vibration API on unsupported devices.
 */
function triggerIOSHaptic(pattern: HapticPattern): boolean {
  const w = window as unknown as {
    webkit?: { messageHandlers?: { haptic?: { postMessage: (msg: unknown) => void } } };
  };

  const haptic = w.webkit?.messageHandlers?.haptic;
  if (!haptic) return false;

  const map: Record<string, { type: string; style?: string }> = {
    light: { type: "impactOccurred", style: "light" },
    medium: { type: "impactOccurred", style: "medium" },
    heavy: { type: "impactOccurred", style: "heavy" },
    success: { type: "notificationOccurred", style: "success" },
    warning: { type: "notificationOccurred", style: "warning" },
    error: { type: "notificationOccurred", style: "error" },
  };

  const cfg = map[pattern];
  if (!cfg) return false;

  try {
    haptic.postMessage(cfg);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook for haptic feedback on mobile devices.
 * Uses navigator.vibrate as primary, falls back to none on unsupported devices.
 *
 * Pattern mapping (inspired by Robinhood/Coinbase):
 * - light:    Subtle tap feedback (tab presses, small interactions)
 * - medium:   Standard press feedback (button presses, toggles)
 * - heavy:    Strong feedback (important actions, confirmations)
 * - success:  Celebration pattern (trade executed, order filled)
 * - warning:  Caution pattern (unsaved changes, validation errors)
 * - error:    Alert pattern (failed transaction, critical error)
 *
 * Usage:
 *   const haptic = useHaptic();
 *   haptic("medium"); // on button press
 */
export function useHaptic() {
  return useCallback(
    (pattern: HapticPattern = "light") => {
      if (pattern === "none") return;
      if (typeof navigator === "undefined") return;

      // Try iOS webkit haptic first (PWA / WKWebView)
      if (triggerIOSHaptic(pattern)) return;

      // Fallback to standard Vibration API (Android, modern browsers)
      if (!navigator.vibrate) return;

      try {
        const duration = PATTERNS[pattern];
        navigator.vibrate(duration);
      } catch {
        // Silently fail on unsupported devices
      }
    },
    []
  );
}

/**
 * Convenience hook that returns both the haptic trigger and
 * a wrapper for common UI events.
 */
export function useHapticFeedback() {
  const haptic = useHaptic();

  const withHaptic = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      fn: T,
      pattern: HapticPattern = "medium"
    ) => {
      return (...args: Parameters<T>): ReturnType<T> => {
        haptic(pattern);
        return fn(...args) as ReturnType<T>;
      };
    },
    [haptic]
  );

  return { haptic, withHaptic };
}
