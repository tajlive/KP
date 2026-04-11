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
    // Load all consolidated namespaces for the locale
    const [
      common,
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
      about,
      competition,
      help,
      legal,
      tax
    ] = await Promise.all([
      import(`../messages/${validLocale}/common.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/common.json").then((m) => m.default)),
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
      import(`../messages/${validLocale}/about.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/about.json").then((m) => m.default)),
      import(`../messages/${validLocale}/competition.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/competition.json").then((m) => m.default)),
      import(`../messages/${validLocale}/help.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/help.json").then((m) => m.default)),
      import(`../messages/${validLocale}/legal.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/legal.json").then((m) => m.default)),
      import(`../messages/${validLocale}/tax.json`)
        .then((m) => m.default)
        .catch(() => import("../messages/en/tax.json").then((m) => m.default)),
    ]);

    return {
      locale: validLocale,
      messages: {
        common,
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
        about,
        competition,
        help,
        legal,
        tax
      },
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
