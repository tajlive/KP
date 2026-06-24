import { locales, defaultLocale, type Locale } from "@/i18n/config";

export function resolveLocale(raw: string | undefined): Locale {
  if (raw && locales.includes(raw as Locale)) {
    return raw as Locale;
  }
  return defaultLocale;
}

export type { Locale as ValidLocale };
