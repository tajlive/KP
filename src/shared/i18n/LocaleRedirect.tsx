"use client";

/**
 * Tidligere forsøk på Accept-Language → /en/ redirect er fjernet.
 *
 * Kilde for språk: **URL** + next-intl (`src/i18n/routing.config.ts`: `localeDetection: false`).
 * Brukere skal ikke automatisk sendes til engelsk dashboard bare fordi nettleseren er satt til en.
 *
 * Eksplisitt språkvalg skjer via `LanguageSwitcher` (router.replace med locale).
 */
export function LocaleRedirect() {
  return null;
}
