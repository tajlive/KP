import { getLocale } from "next-intl/server";

/** Tall/dato: nb-NO for alt utenom eksplisitt `en` (standardlocale er norsk). */
export async function getDashboardNumberLocale(): Promise<string> {
  const locale = await getLocale();
  return locale === "en" ? "en-US" : "nb-NO";
}
