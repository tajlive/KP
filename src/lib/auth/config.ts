/**
 * Auth Configuration - Single source of truth for all auth settings
 *
 * This file centralizes all authentication configuration to ensure
 * consistency across the application and prevent redirect_uri_mismatch errors.
 */

import { locales, defaultLocale } from "@/i18n/config";

// Environment detection
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isMicrosoftOAuthEnabled =
  process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH === "true";
export const isAppleOAuthEnabled =
  process.env.NEXT_PUBLIC_ENABLE_APPLE_OAUTH === "true";

// Valid locales are derived from the i18n source of truth.
export type ValidLocale = (typeof locales)[number];
const VALID_LOCALE_SET = new Set<string>(locales);

export function isValidLocale(locale: string): locale is ValidLocale {
  return VALID_LOCALE_SET.has(locale);
}

// Canonical origins for auth redirects.
const CANONICAL_APP_ORIGIN = "https://www.klarpakke.no";
const DEVELOPMENT_APP_ORIGIN = "http://localhost:3000";
const ALLOWED_APP_ORIGINS = new Set([
  CANONICAL_APP_ORIGIN,
  DEVELOPMENT_APP_ORIGIN,
]);

/** Strip whitespace/newlines that can sneak in from env vars (prevents %250A in OAuth redirects) */
function sanitizeUrl(url: string): string {
  return url.trim().replace(/[\r\n]/g, "");
}

function safeOrigin(url: string): string {
  try {
    return new URL(sanitizeUrl(url)).origin;
  } catch {
    return isProduction ? CANONICAL_APP_ORIGIN : DEVELOPMENT_APP_ORIGIN;
  }
}

export function getCanonicalAppOrigin(): string {
  return CANONICAL_APP_ORIGIN;
}

export function getDevelopmentAppOrigin(): string {
  return DEVELOPMENT_APP_ORIGIN;
}

export function getAppUrl(): string {
  // 1. Browser context: Always use the current origin to ensure PKCE cookies match the domain
  if (typeof window !== "undefined") {
    return sanitizeUrl(window.location.origin);
  }

  // 2. Explicitly configured APP_URL (Production)
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    const origin = safeOrigin(configured);
    if (isProduction && !ALLOWED_APP_ORIGINS.has(origin)) {
      console.warn(
        `[auth/config] NEXT_PUBLIC_APP_URL origin ${origin} is not in the allowed list, falling back to ${CANONICAL_APP_ORIGIN}.`,
      );
      return CANONICAL_APP_ORIGIN;
    }
    return sanitizeUrl(configured);
  }

  // 3. Environment-specific fallback
  return isProduction ? CANONICAL_APP_ORIGIN : DEVELOPMENT_APP_ORIGIN;
}

/**
 * Get callback URL for OAuth providers.
 *
 * CRITICAL SAFETY RULES:
 * 1. Uses new URL().origin to STRIP any path from NEXT_PUBLIC_APP_URL.
 *    If APP_URL is wrongly set to https://www.klarpakke.no/auth, this
 *    returns https://www.klarpakke.no (no path suffix).
 *    Without this: /auth + /callback = /auth/callback (exchange_failed)
 *
 * 2. Validates locale against the i18n source of truth to prevent invalid
 *    locale segments from ending up in the callback path.
 *
 * 3. Never use window.location or request.headers for OAuth redirectTo —
 *    always use the canonical env var.
 */
export function getCallbackUrl(locale: string = defaultLocale): string {
  const rawUrl = sanitizeUrl(getAppUrl());

  // Strip path, query, hash — keep only origin (protocol + hostname + port)
  // e.g. 'https://www.klarpakke.no/auth' → 'https://www.klarpakke.no'
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    origin = CANONICAL_APP_ORIGIN;
  }

  const safeLocale: ValidLocale = isValidLocale(locale) ? locale : defaultLocale;

  return `${origin}/${safeLocale}/callback`;
}

// Supported OAuth providers
export const SUPPORTED_PROVIDERS = {
  GOOGLE: "google",
  MICROSOFT: "azure", // Supabase uses 'azure' for Microsoft
  APPLE: "apple",
  VIPPS: "vipps", // Custom OAuth flow via /api/auth/vipps-url + callback
} as const;

// Provider display names
export const PROVIDER_NAMES: { [key: string]: string } = {
  google: "Google",
  azure: "Microsoft",
  apple: "Apple",
  vipps: "Vipps",
  email: "E-post",
};

// OAuth provider configuration
export const OAUTH_CONFIG: Record<
  string,
  {
    scopes?: string;
    queryParams?: Record<string, string>;
  }
> = {
  google: {
    // CRITICAL: Eksplisitte basic scopes for å unngå "unverified app" feil
    // Hvis vi ber om sensitive scopes (gmail, drive, etc.) uten godkjenning,
    // får brukeren "access_denied" eller "unverified app" advarsel
    scopes: "openid email profile",
  },
  azure: {
    scopes: "email profile openid",
  },
  apple: {
    scopes: "email name",
  },
  // Vipps uses custom OAuth flow via Supabase Auth
};

// Error messages (Norwegian)
export const AUTH_ERRORS: { [key: string]: string } = {
  no_code: "Ingen autorisasjonskode mottatt fra leverandør.",
  exchange_failed:
    "Google-innlogging feilet (sjekk at informasjonskapsler ikke blokkeres, eller prøv e-post/passord).",
  callback_error: "En uventet feil oppstod under innlogging.",
  admin_auth_required: "Admin-autentisering kreves.",
  provider_error: "Feil fra innloggingsleverandør.",
  invalid_state: "Ugyldig tilstand - sikkerhetsfeil.",
  session_expired: "Økten er utløpt. Vennligst logg inn på nytt.",
  user_not_found: "Bruker ikke funnet.",
  unauthorized: "Ikke autorisert.",
  vipps_missing_verifier: "Vipps-innlogging utløpt. Prøv igjen.",
  vipps_config: "Vipps er ikke konfigurert. Kontakt support.",
  vipps_userinfo: "Kunne ikke hente brukerinfo fra Vipps. Prøv igjen.",
  vipps_email_not_verified: "E-postadressen fra Vipps er ikke bekreftet.",
  vipps_email_exists:
    "En konto med denne e-posten finnes allerede. Koble Vipps fra kontoinnstillingene.",
  vipps_sub_linked_other:
    "Vipps-kontoen er allerede koblet til en annen bruker.",
  vipps_missing_params: "Ugyldig eller manglende Vipps-respons.",
  vipps_state_store_unavailable:
    "Vipps-innlogging er midlertidig utilgjengelig. Prøv igjen senere.",
};

// Get human-readable error message
export function getAuthErrorMessage(errorCode: string | null): string {
  if (!errorCode) return "";
  return (
    AUTH_ERRORS[errorCode] || "En ukjent feil oppstod. Vennligst prøv igjen."
  );
}

// Session configuration
export const SESSION_CONFIG = {
  // Time before session refresh (in milliseconds)
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
  // Max session age (in seconds)
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
