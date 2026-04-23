import { getTranslations } from "next-intl/server";

type ValidLocale = "no" | "en" | "th" | "zh";

function normalizePath(strippedPath: string): string {
  if (!strippedPath || strippedPath === "") return "/";
  return strippedPath.startsWith("/") ? strippedPath : `/${strippedPath}`;
}

/** Paths where streamed generateMetadata arrives too late for Lighthouse SEO audits */
export function isEarlyMetaDescriptionPath(strippedPath: string): boolean {
  const path = normalizePath(strippedPath);
  // NOTE: "/" (landing) is EXCLUDED because page.tsx has generateMetadata()
  // which Next.js renders as <meta name="description">. Adding early meta
  // here creates a DUPLICATE tag. See: e2e/smoke/launch-critical.spec.ts
  if (path === "/priser" || path.startsWith("/priser/")) return true;
  if (path === "/login" || path.startsWith("/login/")) return true;
  return false;
}

/**
 * Meta description emitted synchronously in <head> so crawlers and Lighthouse
 * see it before streaming RSC chunks (generateMetadata can arrive after <body>).
 */
export async function getEarlyMetaDescription(
  locale: ValidLocale,
  strippedPath: string,
): Promise<string> {
  const path = normalizePath(strippedPath);

  if (path === "/") {
    if (locale === "no") {
      return "Kurs, papirhandel og auto-handel på norsk. Start gratis med 100 000 kr i lekepenger — uten kredittkort.";
    }
    return "Courses, paper trading and auto-trading in one place. Start free with 100,000 NOK in practice funds — no credit card.";
  }

  if (path === "/priser" || path.startsWith("/priser/")) {
    const t = await getTranslations({ locale, namespace: "pricing.metadata" });
    return t("description");
  }

  if (path === "/login" || path.startsWith("/login/")) {
    const t = await getTranslations({ locale, namespace: "metadata" });
    return t("login.description");
  }

  return locale === "no"
    ? "Norges smarteste crypto trading bot. Øv med papirhandel, aktiver autotrading og la boten jobbe for deg — helt på norsk."
    : "Norway's smartest crypto trading bot. Practice with paper trading, activate autotrading, and let the bot work for you.";
}
