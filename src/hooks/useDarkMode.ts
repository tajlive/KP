"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/utils";

const STORAGE_KEY = "theme";

/**
 * Simple dark/light mode toggle hook.
 *
 * - Leser preferanse fra localStorage
 * - Toggler 'dark' klasse på <html>
 * - Lagrer valg i user_preferences tabell hvis innlogget
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Synkroniser fra DOM / localStorage ved mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    let dark = true;
    if (stored === "light") {
      dark = false;
    } else if (stored === "dark") {
      dark = true;
    } else if (stored === "system") {
      dark = prefersDark;
    } else {
      dark = prefersDark; // default til system
    }

    setIsDark(dark);
    applyClass(dark);
    setMounted(true);
  }, []);

  const applyClass = useCallback((dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      applyClass(next);
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");

      // Lagre til Supabase hvis innlogget
      void (async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("user_profiles")
              .update({
                ui_theme: next ? "dark" : "light",
                updated_at: new Date().toISOString(),
              } as never)
              .eq("id", user.id);
          }
        } catch {
          // localStorage er fallback — silent fail
        }
      })();

      return next;
    });
  }, [applyClass]);

  return {
    isDark,
    toggle,
    mounted,
  };
}
