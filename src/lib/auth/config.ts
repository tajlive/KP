/**
 * Auth Configuration - Single source of truth for all auth settings
 *
 * This file centralizes all authentication configuration to ensure
 * consistency across the application and prevent redirect_uri_mismatch errors.
 */

// Environment detection
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";

// Valid locales for type safety
const VALID_LOCALES = ["no", "en", "th", "zh"] as const;
type ValidLocale = (typeof VALID_LOCALES)[number];

// App URLs - uses NEXT_PUBLIC_APP_URL from Vercel dashboard.
// Fallback to NEXT_PUBLIC_VERCEL_URL for Preview deployments if APP_URL is missing.
export function getAppUrl(): string {
  // 1. Browser context: Always use the current origin to ensure PKCE cookies match the domain
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 2. Explicitly configured APP_URL (Production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 3. Vercel Preview deployments
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 4. Default fallback
  return "https://www.klarpakke.no";
}

/**
 * Get callback URL for OAuth providers.
 *
 * CRITICAL SAFETY RULES:
 * 1. Uses new URL().origin to STRIP any path from NEXT_PUBLIC_APP_URL.
 *    If APP_URL is wrongly set to https://www.klarpakke.no/auth, this
 *    returns https://www.klarpakke.no (no path suffix).
 *    Without this: /auth + /auth/callback = /auth/auth/callback (exchange_failed)
 *
 * 2. Validates locale against VALID_LOCALES to prevent /auth/auth/callback
 *    when a user lands on /auth/innlogging (locale='auth' from next-intl).
 *
 * 3. Never use window.location or request.headers for OAuth redirectTo —
 *    always use the canonical env var.
 */
export function getCallbackUrl(locale: string = "no"): string {
  const rawUrl = getAppUrl();

  // Strip path, query, hash — keep only origin (protocol + hostname + port)
  // e.g. 'https://www.klarpakke.no/auth' → 'https://www.klarpakke.no'
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    // Fallback if URL parsing fails
    origin = "https://www.klarpakke.no";
  }

  const safeLocale: ValidLocale = (VALID_LOCALES as readonly string[]).includes(
    locale,
  )
    ? (locale as ValidLocale)
    : "no";

  // Use non-localized callback to avoid i18n redirect issues
  return `${origin}/auth/callback?locale=${safeLocale}`;
}

// Supported OAuth providers
export const SUPPORTED_PROVIDERS = {
  GOOGLE: "google",
  MICROSOFT: "azure", // Supabase uses 'azure' for Microsoft
  LINKEDIN: "linkedin", // Supabase Auth provider
  VIPPS: "vipps", // Custom OAuth flow via /api/auth/vipps-url + callback
} as const;

// Provider display names (Norwegian)
export const PROVIDER_NAMES: { [key: string]: string } = {
  google: "Google",
  azure: "Microsoft",
  linkedin: "LinkedIn",
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
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
  azure: {
    scopes: "email profile openid",
  },
  linkedin: {
    scopes: "openid email profile",
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
};

// Get human-readable error message
export function getAuthErrorMessage(errorCode: string | null): string {
  if (!errorCode) return "";
  return (
    AUTH_ERRORS[errorCode] || "En ukjent feil oppstod. Vennligst prøv igjen."
  );
}

// Cookie configuration
export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "none" as const,
  secure: true,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// Session configuration
export const SESSION_CONFIG = {
  // Time before session refresh (in milliseconds)
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
  // Max session age (in seconds)
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
