/**
 * Kun `defineRouting` — brukes av middleware uten å dra inn `next-intl/navigation`
 * (createNavigation er tung og hører hjemme i client-bundles).
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["no", "en"],
  defaultLocale: "no",
  localePrefix: "as-needed",
  // Ikke bruk Accept-Language til å omdirigere /dashboard → /en/dashboard.
  localeDetection: false,
  // Eksplisitt definere auth routes uten locale prefix
  pathnames: {
    "/auth/login": {
      no: "/auth/login",
      en: "/auth/login",
    },
    "/auth/register": {
      no: "/auth/register",
      en: "/auth/register",
    },
    "/auth/callback": {
      no: "/auth/callback",
      en: "/auth/callback",
    },
    "/auth/reset-password": {
      no: "/auth/reset-password",
      en: "/auth/reset-password",
    },
    "/auth/update-password": {
      no: "/auth/update-password",
      en: "/auth/update-password",
    },
  },
});
