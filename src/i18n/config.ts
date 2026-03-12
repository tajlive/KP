// Available locales
// - no: Norwegian (default, visible)
// - en: English (visible)
// - th: Thai (hidden but accessible via direct URL /th/*)
// - zh: Chinese (hidden but accessible via direct URL /zh/*)
export const locales = ["no", "en"] as const;
// Thai and Chinese temporarily disabled until translations are complete
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "no";

export const localeLabels: Record<
  Locale,
  { label: string; flag: string; hidden?: boolean }
> = {
  no: { label: "Norsk", flag: "🇳🇴" },
  en: { label: "English", flag: "🇬🇧" },
};

// TODO: Re-enable Thai and Chinese when translations are complete
// th: { label: "ไทย", flag: "🇹🇭", hidden: true },
// zh: { label: "中文", flag: "🇨🇳", hidden: true },
