// Available locales
// - no: Norwegian (default, visible)
// - en: English (visible)
// - th: Thai (hidden but accessible via direct URL /th/*)
// - zh: Chinese (hidden but accessible via direct URL /zh/*)
export const locales = ["no", "en", "th", "zh"] as const;
export const visibleLocales = ["no", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "no";

export const localeLabels: Record<
  Locale,
  { label: string; flag: string; hidden?: boolean }
> = {
  no: { label: "Norsk", flag: "🇳🇴" },
  en: { label: "English", flag: "🇬🇧" },
  th: { label: "ไทย", flag: "🇹🇭", hidden: true },
  zh: { label: "中文", flag: "🇨🇳", hidden: true },
};

// Languages that need review (AI translated)
export const needsReview: Locale[] = ["th", "zh"];
