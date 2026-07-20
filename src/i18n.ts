import { getRequestConfig } from "next-intl/server";
import { Locale, defaultLocale, locales } from "./i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  let validLocale: Locale = defaultLocale;
  try {
    const locale = await requestLocale;
    validLocale = locales.includes(locale as Locale)
      ? (locale as Locale)
      : defaultLocale;
  } catch {
    // requestLocale can throw in edge/static contexts; keep defaultLocale
  }

  try {
    // Load Norwegian as base — ensures all keys exist
    const baseNo = await import("../messages/no.json")
      .then((m) => m.default)
      .catch(() => ({}));

    // Load target locale and merge over Norwegian base
    const targetConsolidated = await import(`../messages/${validLocale}.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en.json").then((m) => m.default));

    // Deep merge: target keys override Norwegian keys
    const messages = deepMerge(baseNo, targetConsolidated);

    return {
      locale: validLocale,
      messages,
      onError(error: { code: string; message: string }) {
        if (error.code === "INSUFFICIENT_PATH") return;
        console.error("[i18n]", error.code, error.message || error);
      },
      getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
        return namespace ? `${namespace}.${key}` : key;
      },
    };
  } catch (err) {
    console.error("[i18n.ts] FATAL:", err);
    return {
      locale: defaultLocale,
      messages: {},
      onError() {},
      getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
        return namespace ? `${namespace}.${key}` : key;
      },
    };
  }
});

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output = { ...target };
  for (const [key, sVal] of Object.entries(source)) {
    const tVal = target[key];
    if (
      typeof sVal === "object" && sVal !== null && !Array.isArray(sVal) &&
      typeof tVal === "object" && tVal !== null && !Array.isArray(tVal)
    ) {
      output[key] = deepMerge(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      output[key] = sVal;
    }
  }
  return output;
}
