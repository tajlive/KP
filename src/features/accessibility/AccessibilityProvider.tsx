"use client";

import { useEffect, useRef } from "react";

type ProfileA11yFields = {
  font_size_preference?: "normal" | "large";
  high_contrast_mode?: boolean;
};

/**
 * Global Accessibility Provider
 *
 * Reads font_size_preference and high_contrast_mode from the user's profile
 * via the server API (which reads the httpOnly auth cookie) and applies the
 * corresponding CSS classes (text-lg, high-contrast) to <html>.
 *
 * Must be rendered inside a client boundary that has access to auth cookies.
 * Renders children without wrapping markup.
 */
export default function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return; // Only fetch once
    appliedRef.current = true;

    async function applyAccessibility() {
      try {
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });
        if (!res.ok) return;

        const json = await res.json().catch(() => null);
        const prefs = json?.profile as ProfileA11yFields | undefined;
        if (!prefs) return;

        const root = document.documentElement;

        if (prefs.font_size_preference === "large") {
          root.classList.add("text-lg");
        }

        if (prefs.high_contrast_mode) {
          root.classList.add("high-contrast");
        }
      } catch {
        // Silently fail — accessibility settings are a nice-to-have
      }
    }

    applyAccessibility();
  }, []);

  return <>{children}</>;
}
