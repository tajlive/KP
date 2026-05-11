/** Tall/dato: nb-NO for alt utenom eksplisitt `en` (standardlocale er norsk). */
export async function getDashboardNumberLocale(): Promise<string> {
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  return locale === "en" ? "en-US" : "nb-NO";
}
