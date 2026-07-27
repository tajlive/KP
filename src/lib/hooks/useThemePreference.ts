"use client";

import { useEffect, useCallback } from "react";
import { useTheme } from "@/shared/theme";

export type ThemePreference = "system" | "light" | "dark";

const VALID_THEMES: ThemePreference[] = ["system", "light", "dark"];

/**
 * Hook som synkroniserer tema-valg med user_profiles.ui_theme.
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie) —
 * lesing/skriving går via /api/user/profile som autentiserer server-side.
 * Fallback til localStorage (håndtert av next-themes).
 */
export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Last tema fra profilen ved mount
  useEffect(() => {
    const loadThemeFromProfile = async () => {
      try {
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = await res.json();
        const uiTheme = json?.profile?.ui_theme as string | undefined;
        if (
          uiTheme &&
          uiTheme !== theme &&
          VALID_THEMES.includes(uiTheme as ThemePreference)
        ) {
          setTheme(uiTheme as ThemePreference);
        }
      } catch {
        // Silent fail — next-themes bruker localStorage
      }
    };

    loadThemeFromProfile();
  }, [setTheme]);

  // Lagre tema til profilen
  const saveThemePreference = useCallback(
    async (newTheme: ThemePreference) => {
      try {
        await fetch("/api/user/profile", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ui_theme: newTheme }),
        });
      } catch {
        // Silent fail — localStorage fungerer fortsatt
      }
    },
    []
  );

  // Wrapper for setTheme som også persisterer
  const setThemeWithPersistence = useCallback(
    (newTheme: ThemePreference) => {
      setTheme(newTheme);
      void saveThemePreference(newTheme);
    },
    [setTheme, saveThemePreference]
  );

  return {
    theme: (theme as ThemePreference) || "system",
    resolvedTheme: resolvedTheme as "light" | "dark",
    setTheme: setThemeWithPersistence,
  };
}
