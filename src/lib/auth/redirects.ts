/**
 * Central redirect URL policy for auth flows.
 *
 * Produces only pre-approved, canonical redirect URLs. Avoids ad-hoc string
 * concatenation of redirect targets across the codebase.
 */

import { locales, defaultLocale } from "@/i18n/config";
import { getCanonicalAppOrigin, getDevelopmentAppOrigin } from "./config";

const VALID_LOCALE_SET = new Set<string>(locales);

export type AuthRedirectType =
  | "oauth-callback"
  | "password-reset"
  | "admin-reset";

const AUTH_REDIRECT_PATHS: Record<AuthRedirectType, string> = {
  "oauth-callback": "/callback",
  "password-reset": "/update-password",
  "admin-reset": "/admin/reset-password",
};

export function buildAuthRedirect({
  type,
  locale,
  environment,
}: {
  type: AuthRedirectType;
  locale: string;
  environment?: "production" | "development";
}): string {
  const env =
    environment ??
    (process.env.NODE_ENV === "production" ? "production" : "development");
  const origin =
    env === "production"
      ? getCanonicalAppOrigin()
      : getDevelopmentAppOrigin();
  const safeLocale = VALID_LOCALE_SET.has(locale) ? locale : defaultLocale;

  return `${origin}/${safeLocale}${AUTH_REDIRECT_PATHS[type]}`;
}
