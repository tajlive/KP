"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type Attribute = "class" | `data-${string}`;

export interface UseThemeProps {
  theme?: string;
  setTheme: (theme: string) => void;
  forcedTheme?: string;
  resolvedTheme?: string;
  themes: string[];
  systemTheme?: "light" | "dark";
}

export interface ThemeProviderProps {
  attribute?: Attribute | Attribute[];
  defaultTheme?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  themes?: string[];
  value?: Record<string, string>;
  forcedTheme?: string;
  disableTransitionOnChange?: boolean;
  children: React.ReactNode;
  nonce?: string;
}

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

const defaultContext: UseThemeProps = {
  setTheme: () => {},
  themes: [],
};

export function useTheme() {
  return React.useContext(ThemeContext) ?? defaultContext;
}

const MEDIA = "(prefers-color-scheme: dark)";
const SYSTEM_THEMES: string[] = ["light", "dark"];

function getSystemTheme(e?: { matches: boolean }) {
  try {
    const media = e ?? window.matchMedia(MEDIA);
    return media.matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function disableAnimation(nonce?: string) {
  const css = document.createElement("style");
  if (nonce) css.setAttribute("nonce", nonce);
  css.appendChild(
    document.createTextNode(
      `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`,
    ),
  );
  document.head.appendChild(css);

  return () => {
    // Force restyle
    (() => window.getComputedStyle(document.body))();

    // Wait for next tick before removing
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
}

export function ThemeProvider({
  attribute = "class",
  defaultTheme = "dark",
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  value,
  forcedTheme,
  disableTransitionOnChange = false,
  children,
  nonce,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState(() =>
    typeof window !== "undefined" && theme === "system" && enableSystem
      ? getSystemTheme()
      : theme,
  );
  const initialRef = React.useRef(true);

  // Sync state with localStorage on mount.
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const nextTheme = stored || defaultTheme;
      setThemeState(nextTheme);
      setResolvedTheme(
        nextTheme === "system" && enableSystem ? getSystemTheme() : nextTheme,
      );
    } catch {
      // Unsupported (e.g. disabled localStorage)
    }
  }, [defaultTheme, enableSystem, storageKey]);

  const applyTheme = React.useCallback(
    (themeToApply: string) => {
      if (!themeToApply) return;

      let resolved = themeToApply;
      if (themeToApply === "system" && enableSystem) {
        resolved = getSystemTheme();
      }

      const name = value ? value[resolved] : resolved;
      const enable = disableTransitionOnChange ? disableAnimation(nonce) : null;
      const d = document.documentElement;
      const attrs = !value ? themes : Object.values(value);

      const handleAttribute = (attr: Attribute) => {
        if (attr === "class") {
          d.classList.remove(...attrs);
          if (name) d.classList.add(name);
        } else if (attr.startsWith("data-")) {
          if (name) d.setAttribute(attr, name);
          else d.removeAttribute(attr);
        }
      };

      if (Array.isArray(attribute)) attribute.forEach(handleAttribute);
      else handleAttribute(attribute);

      if (enableColorScheme) {
        const fallback = SYSTEM_THEMES.includes(defaultTheme as Theme)
          ? defaultTheme
          : null;
        const colorScheme = SYSTEM_THEMES.includes(resolved as Theme)
          ? resolved
          : fallback;
        if (colorScheme) d.style.colorScheme = colorScheme;
      }

      enable?.();
    },
    [
      attribute,
      defaultTheme,
      disableTransitionOnChange,
      enableColorScheme,
      enableSystem,
      nonce,
      themes,
      value,
    ],
  );

  const setTheme = React.useCallback(
    (next: string | ((prev: string) => string)) => {
      setThemeState((prev) => {
        const newTheme = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, newTheme);
        } catch {
          // Unsupported
        }
        return newTheme;
      });
    },
    [storageKey],
  );

  const handleMediaQuery = React.useCallback(
    (e?: { matches: boolean }) => {
      const system = getSystemTheme(e);
      setResolvedTheme(system);
      if (theme === "system" && enableSystem && !forcedTheme) {
        applyTheme("system");
      }
    },
    [applyTheme, enableSystem, forcedTheme, theme],
  );

  // Listen to system preference changes.
  React.useEffect(() => {
    let media: ReturnType<typeof window.matchMedia> | undefined;
    try {
      media = window.matchMedia(MEDIA);
      media.addEventListener("change", handleMediaQuery);
      handleMediaQuery(media);
    } catch {
      // Unsupported
    }
    return () => {
      media?.removeEventListener("change", handleMediaQuery);
    };
  }, [handleMediaQuery]);

  // Listen to cross-tab localStorage changes.
  React.useEffect(() => {
    const handleStorage = (e: Event) => {
      const { key, newValue } = e as unknown as {
        key: string | null;
        newValue: string | null;
      };
      if (key !== storageKey) return;
      const next = newValue || defaultTheme;
      setThemeState(next);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [defaultTheme, storageKey]);

  // Apply theme changes to the DOM. Skip the very first effect run because the
  // inline init script in <head> already applied the theme before hydration.
  React.useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    applyTheme(forcedTheme ?? theme);
  }, [applyTheme, forcedTheme, theme]);

  const providerValue = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme: theme === "system" ? resolvedTheme : theme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem
        ? (resolvedTheme as "light" | "dark")
        : undefined,
    }),
    [theme, setTheme, forcedTheme, resolvedTheme, enableSystem, themes],
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      {children}
    </ThemeContext.Provider>
  );
}
