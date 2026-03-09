"use client";

import { useEffect } from "react";

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
const DEFAULT_LOCALE = "no" as const;

// Paths where auto-redirect based on browser language should NOT occur
// These are typically auth flows or explicit paths where URL = source of truth
const NO_AUTO_REDIRECT_PATHS = [
  "/innlogging",
  "/glemt-passord",
  "/signup",
  "/login",
  "/registrer",
  "/reset-password",
  "/verify",
];

function getPreferredLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      const quality = qValue ? parseFloat(qValue) : 1.0;
      return { code: code.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    if (SUPPORTED_LOCALES.includes(code as typeof SUPPORTED_LOCALES[number])) return code;
    const baseCode = code.split("-")[0];
    if (SUPPORTED_LOCALES.includes(baseCode as typeof SUPPORTED_LOCALES[number])) return baseCode;
    if (baseCode === "nb") return "no";
  }

  return DEFAULT_LOCALE;
}

function isNoAutoRedirectPath(pathname: string): boolean {
  // Check exact matches and sub-paths
  return NO_AUTO_REDIRECT_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function LocaleRedirect() {
  useEffect(() => {
    const pathname = window.location.pathname;
    
    // Skip if already has explicit non-default locale prefix
    // Default locale (no) has no prefix in URL with localePrefix: 'as-needed'
    if (
      pathname.startsWith("/en/") || pathname === "/en" ||
      pathname.startsWith("/th/") || pathname === "/th" ||
      pathname.startsWith("/zh/") || pathname === "/zh"
    ) {
      return;
    }

    // Skip API routes and static files
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return;
    }

    // CRITICAL: Never auto-redirect on auth paths or other explicit paths
    // URL is the source of truth for these pages
    if (isNoAutoRedirectPath(pathname)) {
      return;
    }

    // Check for stored locale preference (respect user choice)
    try {
      const storedLocale = localStorage.getItem("locale");
      if (storedLocale && storedLocale !== DEFAULT_LOCALE) {
        // User has explicitly chosen a different locale, redirect them
        const targetLocale = ["th", "zh"].includes(storedLocale) ? "en" : storedLocale;
        if (!pathname.startsWith(`/${targetLocale}`)) {
          window.location.replace(`/${targetLocale}${pathname}`);
        }
        return;
      }
      if (storedLocale === DEFAULT_LOCALE) {
        // User explicitly chose default locale, stay on no-prefix path
        return;
      }
    } catch {
      // localStorage not available, continue with browser detection
    }

    // Get browser language
    const browserLang = navigator.language;
    const preferredLocale = getPreferredLocale(browserLang);

    // Only redirect non-Norwegian users if they haven't explicitly chosen a locale
    // AND they're not already on a localized path
    // AND they're not on an auth/explicit path
    if (preferredLocale !== DEFAULT_LOCALE) {
      const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;
      
      // Use replace to avoid adding to history
      window.location.replace(`/${targetLocale}${pathname}`);
    }
  }, []);

  return null;
}
