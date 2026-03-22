import { getTranslations } from "next-intl/server";

type ValidLocale = "no" | "en" | "th" | "zh";

function normalizePath(strippedPath: string): string {
  if (!strippedPath || strippedPath === "") return "/";
  return strippedPath.startsWith("/") ? strippedPath : `/${strippedPath}`;
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

  if (path === "/innlogging" || path.startsWith("/innlogging/")) {
    const t = await getTranslations({ locale, namespace: "metadata" });
    return t("login.description");
  }

  return locale === "no"
    ? "Norges smarteste crypto trading bot. Øv med papirhandel, aktiver autotrading og la boten jobbe for deg — helt på norsk."
    : "Norway's smartest crypto trading bot. Practice with paper trading, activate autotrading, and let the bot work for you.";
}
