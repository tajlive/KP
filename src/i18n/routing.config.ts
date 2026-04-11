/**
 * Kun `defineRouting` — brukes av middleware uten å dra inn `next-intl/navigation`
 * (createNavigation er tung og hører hjemme i client-bundles).
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["no", "en"],
  defaultLocale: "no",
  localePrefix: "always",
  // Ikke bruk Accept-Language til å omdirigere /dashboard → /en/dashboard.
  localeDetection: false,
});
