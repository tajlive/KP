"use client";

import { useEffect } from "react";

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
const DEFAULT_LOCALE = "no" as const;

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

export function LocaleRedirect() {
  useEffect(() => {
    const pathname = window.location.pathname;
    
    // Skip if already has locale prefix (with or without trailing slash)
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

    // Get browser language
    const browserLang = navigator.language;
    const preferredLocale = getPreferredLocale(browserLang);

    // Redirect non-Norwegian users to /en/
    if (preferredLocale !== DEFAULT_LOCALE) {
      const targetLocale = ["th", "zh"].includes(preferredLocale) ? "en" : preferredLocale;
      
      // Use replace to avoid adding to history
      window.location.replace(`/${targetLocale}${pathname}`);
    }
  }, []);

  return null;
}
