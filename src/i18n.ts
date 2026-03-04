import { getRequestConfig } from "next-intl/server";
import { Locale, defaultLocale, locales } from "./i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  // In next-intl v4, locale comes from requestLocale
  const locale = await requestLocale;

  // Validate locale, fallback to default if invalid
  const validLocale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  // Load all namespaces for the locale
  const [
    base,
    landing,
    footer,
    navigation,
    payment,
    checkout,
    dashboard,
    beta,
    auth,
    paperTrading,
    metadata,
    quizPage,
    helpPage,
    autoTradingPage,
    taxReport,
    simulator,
    aboutUs,
    tradeHistory,
    wallet,
    adminDashboard,
    onboarding,
    legal,
    settings,
    courses,
    trading,
    // New namespaces that were missing
    admin,
    autoTrade,
    autoTrading,
    binanceGuide,
    calculator,
    common,
    competition,
    gamification,
    hero,
    interestTest,
    leagues,
    learning,
    notifications,
    pricingCancel,
    pricingSuccess,
    studieprogram,
    // Previously missing namespaces
    contact,
    pricing,
    liveTrading,
    meta,
    orderHistory,
  ] = await Promise.all([
    import(`../messages/${validLocale}/base.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/base.json").then((m) => m.default)),
    import(`../messages/${validLocale}/landing.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/landing.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/footer.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/footer.json").then((m) => m.default)),
    import(`../messages/${validLocale}/navigation.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/navigation.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/payment.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/payment.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/checkout.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/checkout.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/dashboard.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/dashboard.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/beta.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/beta.json").then((m) => m.default)),
    import(`../messages/${validLocale}/auth.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/auth.json").then((m) => m.default)),
    import(`../messages/${validLocale}/paperTrading.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/paperTrading.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/metadata.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/metadata.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/quizPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/quizPage.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/helpPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/helpPage.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/autoTradingPage.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/autoTradingPage.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/taxReport.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/taxReport.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/simulator.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/simulator.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/aboutUs.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/aboutUs.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/tradeHistory.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/tradeHistory.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/wallet.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/wallet.json").then((m) => m.default)),
    import(`../messages/${validLocale}/adminDashboard.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/adminDashboard.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/onboarding.json`)
      .then((m) => m.default)
      .catch(() =>
        import("../messages/en/onboarding.json").then((m) => m.default),
      ),
    import(`../messages/${validLocale}/legal.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/legal.json").then((m) => m.default)),
    import(`../messages/${validLocale}/settings.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/settings.json").then((m) => m.default)),
    import(`../messages/${validLocale}/courses.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/courses.json").then((m) => m.default)),
    import(`../messages/${validLocale}/trading.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/trading.json").then((m) => m.default)),
    // New namespaces
    import(`../messages/${validLocale}/admin.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/admin.json").then((m) => m.default)),
    import(`../messages/${validLocale}/autoTrade.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/autoTrade.json").then((m) => m.default)),
    import(`../messages/${validLocale}/autoTrading.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/autoTrading.json").then((m) => m.default)),
    import(`../messages/${validLocale}/binanceGuide.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/binanceGuide.json").then((m) => m.default)),
    import(`../messages/${validLocale}/calculator.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/calculator.json").then((m) => m.default)),
    import(`../messages/${validLocale}/common.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/common.json").then((m) => m.default)),
    import(`../messages/${validLocale}/competition.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/competition.json").then((m) => m.default)),
    import(`../messages/${validLocale}/gamification.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/gamification.json").then((m) => m.default)),
    import(`../messages/${validLocale}/hero.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/hero.json").then((m) => m.default)),
    import(`../messages/${validLocale}/interestTest.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/interestTest.json").then((m) => m.default)),
    import(`../messages/${validLocale}/leagues.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/leagues.json").then((m) => m.default)),
    import(`../messages/${validLocale}/learning.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/learning.json").then((m) => m.default)),
    import(`../messages/${validLocale}/notifications.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/notifications.json").then((m) => m.default)),
    import(`../messages/${validLocale}/pricingCancel.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/pricingCancel.json").then((m) => m.default)),
    import(`../messages/${validLocale}/pricingSuccess.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/pricingSuccess.json").then((m) => m.default)),
    import(`../messages/${validLocale}/studieprogram.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/studieprogram.json").then((m) => m.default)),
    // Previously missing namespaces
    import(`../messages/${validLocale}/contact.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/contact.json").then((m) => m.default)),
    import(`../messages/${validLocale}/pricing.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/pricing.json").then((m) => m.default)),
    import(`../messages/${validLocale}/liveTrading.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/liveTrading.json").then((m) => m.default)),
    import(`../messages/${validLocale}/meta.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/meta.json").then((m) => m.default)),
    import(`../messages/${validLocale}/orderHistory.json`)
      .then((m) => m.default)
      .catch(() => import("../messages/en/orderHistory.json").then((m) => m.default)),
  ]);

  return {
    locale: validLocale,
    messages: {
      base,
      landing,
      footer,
      navigation,
      payment,
      checkout,
      dashboard,
      beta,
      auth,
      paperTrading,
      metadata,
      quizPage,
      helpPage,
      autoTradingPage,
      taxReport,
      simulator,
      aboutUs,
      tradeHistory,
      wallet,
      adminDashboard,
      onboarding,
      legal,
      settings,
      courses,
      trading,
      // New namespaces
      admin,
      autoTrade,
      autoTrading,
      binanceGuide,
      calculator,
      common,
      competition,
      gamification,
      hero,
      interestTest,
      leagues,
      learning,
      notifications,
      pricingCancel,
      pricingSuccess,
      studieprogram,
      // Previously missing namespaces
      contact,
      pricing,
      liveTrading,
      meta,
      orderHistory,
    },
    // Error handling - don't crash on missing messages
    onError(error) {
      if (error.code === 'INSUFFICIENT_PATH') {
        // Suppress — happens during SSG for pages rendered without full request context
        return;
      }
      console.error('[i18n ERROR]', error.code, error.message || error);
    },
    getMessageFallback({ namespace, key }) {
      // Return visible fallback so missing keys are obvious in UI
      return `[MISSING: ${namespace ? namespace + '.' : ''}${key}]`;
    },
  };
});
