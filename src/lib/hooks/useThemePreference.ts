"use client";

import { useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/utils";

export type ThemePreference = "system" | "light" | "dark";

/**
 * Hook som synkroniserer tema-valg med Supabase user_profiles
 * - Laster fra Supabase ved mount (hvis innlogget)
 * - Lagrer til Supabase når bruker endrer tema
 * - Fallback til localStorage (håndtert av next-themes)
 */
export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const supabase = createClient();

  // Last tema fra Supabase ved mount
  useEffect(() => {
    const loadThemeFromProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("ui_theme")
          .eq("id", user.id)
          .single();

        // Type assertion needed until ui_theme is in generated types
        // See: supabase/migrations/20260403180000_add_ui_theme_to_user_profiles.sql
        const uiTheme = (profile as { ui_theme?: string } | null)?.ui_theme;
        if (uiTheme && uiTheme !== theme) {
          // Valider at verdien er gyldig
          const validThemes: ThemePreference[] = ["system", "light", "dark"];
          if (validThemes.includes(uiTheme as ThemePreference)) {
            setTheme(uiTheme as ThemePreference);
          }
        }
      } catch {
        // Silently fail - next-themes vil bruke localStorage
      }
    };

    loadThemeFromProfile();
  }, [supabase, setTheme, theme]);

  // Lagre tema til Supabase
  const saveThemePreference = useCallback(
    async (newTheme: ThemePreference) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any)
          .from("user_profiles")
          .update({ ui_theme: newTheme, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch {
        // Silently fail - localStorage fungerer fortsatt
      }
    },
    [supabase]
  );

  // Wrapper for setTheme som også lagrer til Supabase
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
