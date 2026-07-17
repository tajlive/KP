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
    // Load Norwegian (defaultLocale) as base layer — ensures all keys exist
    const baseNo = await import("../messages/no.json")
      .then((m) => m.default)
      .catch(() => ({}));

    // Load target locale and merge over Norwegian base
    const targetConsolidated = await import(`../messages/${validLocale}.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en.json").then((m) => m.default));

    const consolidated = deepMerge(baseNo, targetConsolidated);

    // Load actively used split namespaces for the locale.
    // Namespaces whose keys already exist in the consolidated messages/${validLocale}.json
    // (e.g. coursePreview, notifications, tradeHistory) are omitted here.
    const [
      about,
      admin,
      auth,
      autopilot,
      beta,
      checkout,
      common,
      components,
      competition,
      copyTrading,
      dashboard,
      footer,
      gamification,
      help,
      hero,
      landing,
      legal,
      marketplace,
      metadata,
      navigation,
      onboarding,
      pricing,
      quizPage,
      settings,
      strategyMarketplace,
      taxReport,
      threeSteps,
      trading,
      kursPage,
      profile,
      tradingResults,
    ] = await Promise.all([
      import(`../messages/${validLocale}/about.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/about.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/admin.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/admin.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/auth.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/auth.json").then((m) => m.default)),
      import(`../messages/${validLocale}/autopilot.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/autopilot.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/beta.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/beta.json").then((m) => m.default)),
      import(`../messages/${validLocale}/checkout.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/checkout.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/common.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/common.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/components.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/components.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/competition.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/competition.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/copyTrading.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/copyTrading.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/dashboard.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/dashboard.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/footer.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/footer.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/gamification.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/gamification.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/help.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/help.json").then((m) => m.default)),
      import(`../messages/${validLocale}/hero.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/hero.json").then((m) => m.default)),
      import(`../messages/${validLocale}/landing.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/landing.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/legal.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/legal.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/marketplace.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/marketplace.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/metadata.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/metadata.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/navigation.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/navigation.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/onboarding.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/onboarding.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/pricing.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/pricing.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/quizPage.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/quizPage.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/settings.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/settings.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/strategyMarketplace.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/strategyMarketplace.json").then(
            (m) => m.default,
          ),
        ),
      import(`../messages/${validLocale}/taxReport.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/taxReport.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/threeSteps.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/threeSteps.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/trading.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/trading.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/kursPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/kursPage.json").then((m) => m.default),
      ),
      import(`../messages/${validLocale}/profile.json`)
        .then((m) => m.default)
        .catch(() =>
          import("../messages/en/profile.json").then((m) => m.default),
        ),
      import(`../messages/${validLocale}/tradingResults.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/tradingResults.json").then((m) => m.default),
      ),
    ]);

    const splits: Record<string, unknown> = {
      about,
      admin,
      auth,
      autopilot,
      beta,
      checkout,
      common,
      components,
      competition,
      copyTrading,
      dashboard,
      footer,
      gamification,
      help,
      hero,
      helpPage: help,
      landing,
      legal,
      marketplace,
      metadata,
      navigation,
      onboarding,
      pricing,
      quizPage,
      settings,
      strategyMarketplace,
      taxReport,
      threeSteps,
      trading,
      tradingResults,
      kursPage,
      contact: (metadata as Record<string, unknown>)?.contact,
    };

    function deepMerge(
      target: Record<string, unknown>,
      source: Record<string, unknown>,
    ): Record<string, unknown> {
      const output = { ...target };
      Object.keys(source).forEach((key) => {
        const sVal = source[key];
        const tVal = target[key];
        if (
          typeof sVal === "object" &&
          sVal !== null &&
          !Array.isArray(sVal) &&
          typeof tVal === "object" &&
          tVal !== null &&
          !Array.isArray(tVal)
        ) {
          output[key] = deepMerge(
            tVal as Record<string, unknown>,
            sVal as Record<string, unknown>,
          );
        } else {
          output[key] = sVal;
        }
      });
      return output;
    }

    const mergedMessages = deepMerge(
      (consolidated || {}) as Record<string, unknown>,
      splits,
    );

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
        // Return key as safe production fallback
        return namespace ? `${namespace}.${key}` : key;
      },
    };
  } catch (err) {
    console.error("[i18n.ts] FATAL ERROR LOADING MESSAGES:", err);
    // Fallback so production never crashes with "Locale Error" (digest)
    const common = await import("../messages/no/common.json")
      .then((m) => m.default)
      .catch(() => ({}));
    return {
      locale: defaultLocale,
      messages: { common },
      onError() {},
      getMessageFallback({ namespace, key }) {
        return namespace ? `${namespace}.${key}` : key;
      },
    };
  }
});
