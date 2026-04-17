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
    // Load consolidated legacy messages as base fallback
    const consolidated = await import(`../messages/${validLocale}.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en.json").then((m) => m.default));

    // Load all consolidated namespaces for the locale
    const [
      common,
      metadata,
      navigation,
      footer,
      auth,
      dashboard,
      trading,
      account,
      marketplace,
      notifications,
      onboarding,
      landing,
      errors,
      admin,
      components,
      simulator,
      education,
      checkout,
      pricing,
      about,
      competition,
      help,
      quiz,
      strategyMarketplace,
      coursePreview,
      threeSteps,
      legal,
      tax
    ] = await Promise.all([
      import(`../messages/${validLocale}/common.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/common.json").then((m) => m.default)),
      import(`../messages/${validLocale}/metadata.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/metadata.json").then((m) => m.default)),
      import(`../messages/${validLocale}/navigation.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/navigation.json").then((m) => m.default)),
      import(`../messages/${validLocale}/footer.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/footer.json").then((m) => m.default)),
      import(`../messages/${validLocale}/auth.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/auth.json").then((m) => m.default)),
      import(`../messages/${validLocale}/dashboard.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/dashboard.json").then((m) => m.default)),
      import(`../messages/${validLocale}/trading.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/trading.json").then((m) => m.default)),
      import(`../messages/${validLocale}/account.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/account.json").then((m) => m.default)),
      import(`../messages/${validLocale}/marketplace.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/marketplace.json").then((m) => m.default)),
      import(`../messages/${validLocale}/notifications.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/notifications.json").then((m) => m.default)),
      import(`../messages/${validLocale}/onboarding.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/onboarding.json").then((m) => m.default)),
      import(`../messages/${validLocale}/landing.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/landing.json").then((m) => m.default)),
      import(`../messages/${validLocale}/errors.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/errors.json").then((m) => m.default)),
      import(`../messages/${validLocale}/admin.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/admin.json").then((m) => m.default)),
      import(`../messages/${validLocale}/components.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/components.json").then((m) => m.default)),
      import(`../messages/${validLocale}/simulator.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/simulator.json").then((m) => m.default)),
      import(`../messages/${validLocale}/education.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/education.json").then((m) => m.default)),
      import(`../messages/${validLocale}/checkout.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/checkout.json").then((m) => m.default)),
      import(`../messages/${validLocale}/pricing.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/pricing.json").then((m) => m.default)),
      import(`../messages/${validLocale}/about.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/about.json").then((m) => m.default)),
      import(`../messages/${validLocale}/competition.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/competition.json").then((m) => m.default)),
      import(`../messages/${validLocale}/help.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/help.json").then((m) => m.default)),
      import(`../messages/${validLocale}/quizPage.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/quizPage.json").then((m) => m.default)),
      import(`../messages/${validLocale}/strategyMarketplace.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/strategyMarketplace.json").then((m) => m.default)),
      import(`../messages/${validLocale}/coursePreview.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/coursePreview.json").then((m) => m.default)),
      import(`../messages/${validLocale}/threeSteps.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/threeSteps.json").then((m) => m.default)),
      import(`../messages/${validLocale}/legal.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/legal.json").then((m) => m.default)),
      import(`../messages/${validLocale}/tax.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/tax.json").then((m) => m.default)),
    ]);

    const splits: Record<string, any> = {
      common,
      metadata,
      navigation,
      footer,
      auth,
      dashboard,
      trading,
      account,
      marketplace,
      notifications,
      onboarding,
      landing,
      errors,
      admin,
      components,
      simulator,
      education,
      checkout,
      pricing,
      about,
      competition,
      helpPage: help,
      quizPage: quiz,
      strategyMarketplace,
      coursePreview,
      threeSteps,
      legal,
      tax
    };

    function deepMerge(target: any, source: any): any {
      if (typeof target !== 'object' || target === null) return source;
      if (typeof source !== 'object' || source === null) return source;
      
      const output = { ...target };
      Object.keys(source).forEach(key => {
        if (
          typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
          typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])
        ) {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      });
      return output;
    }

    const mergedMessages = deepMerge(consolidated || {}, splits);

    return {
      locale: validLocale,
      messages: mergedMessages,
      // Error handling - don't crash on missing messages
      onError(error) {
        if (error.code === "INSUFFICIENT_PATH") {
          // Suppress — happens during SSG for pages rendered without full request context
          return;
        }
        console.error("[i18n ERROR]", error.code, error.message || error);
      },
      getMessageFallback({ namespace, key }) {
        // Return visible fallback so missing keys are obvious in UI
        return `[MISSING: ${namespace ? namespace + "." : ""}${key}]`;
      },
    };
  } catch (err) {
    // Fallback so production never crashes with "Locale Error" (digest)
    const common = await import("../messages/no/common.json")
      .then((m) => m.default)
      .catch(() => ({}));
    return {
      locale: defaultLocale,
      messages: { common },
      onError() {},
      getMessageFallback({ namespace, key }) {
        return `[${namespace ? namespace + "." : ""}${key}]`;
      },
    };
  }
});
