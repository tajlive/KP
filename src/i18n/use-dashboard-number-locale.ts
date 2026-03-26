"use client";

import { useLocale } from "next-intl";

/** Tall/dato: nb-NO for alt utenom eksplisitt `en` (standardlocale er norsk). */
export function useDashboardNumberLocale(): string {
  const locale = useLocale();
  return locale === "en" ? "en-US" : "nb-NO";
}
