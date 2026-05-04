const VALID_LOCALES = ["no", "en", "th", "zh"] as const;
type ValidLocale = (typeof VALID_LOCALES)[number];

export function resolveLocale(raw: string | undefined): ValidLocale {
  if (raw && VALID_LOCALES.includes(raw as ValidLocale)) {
    return raw as ValidLocale;
  }
  return "no";
}

export type { ValidLocale };
