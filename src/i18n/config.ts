// Available locales
// - no: Norwegian (default, visible)
// - en: English (visible)
export const locales = ["no", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "no";

// Shared alias for components that need the supported-locale tuple
export const SUPPORTED_LOCALES = locales;

export const localeLabels: Record<
  Locale,
  { label: string; flag: string; hidden?: boolean }
> = {
  no: { label: "Norsk", flag: "🇳🇴" },
  en: { label: "English", flag: "🇬🇧" },
};
