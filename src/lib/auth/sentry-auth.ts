/**
 * Auth Error Logging - Structured error tracking for authentication flows
 * 
 * Usage:
 *   import { logAuthError, logAuthEvent, AuthErrorCode } from '@/lib/auth/sentry-auth';
 *   logAuthError(AuthErrorCode.GOOGLE_OAUTH_FAILED, error, { userId: '123' });
 */

import {
  captureException,
  captureMessage,
  setUser,
  type SeverityLevel,
} from "@/lib/sentry";

export enum AuthErrorCode {
  // OAuth errors
  GOOGLE_OAUTH_FAILED = "auth:google:oauth_failed",
  GOOGLE_OAUTH_CANCELLED = "auth:google:cancelled",
  GOOGLE_OAUTH_POPUP_BLOCKED = "auth:google:popup_blocked",
  MICROSOFT_OAUTH_FAILED = "auth:microsoft:oauth_failed",
  APPLE_OAUTH_FAILED = "auth:apple:oauth_failed",
  LINKEDIN_OAUTH_FAILED = "auth:linkedin:oauth_failed",
  VIPPS_OAUTH_FAILED = "auth:vipps:oauth_failed",
  
  // PKCE/Callback errors
  PKCE_EXCHANGE_FAILED = "auth:pkce:exchange_failed",
  PKCE_CODE_MISSING = "auth:pkce:code_missing",
  PKCE_VERIFIER_MISSING = "auth:pkce:verifier_missing",
  CALLBACK_ERROR = "auth:callback:error",
  
  // Session errors
  SESSION_INVALID = "auth:session:invalid",
  SESSION_EXPIRED = "auth:session:expired",
  SESSION_REFRESH_FAILED = "auth:session:refresh_failed",
  REFRESH_TOKEN_FAILED = "auth:session:refresh_token_failed",
  
  // Email/password errors
  EMAIL_LOGIN_FAILED = "auth:email:login_failed",
  EMAIL_SIGNUP_FAILED = "auth:email:signup_failed",
  PASSWORD_RESET_FAILED = "auth:password:reset_failed",
  INVALID_RESET_TOKEN = "auth:password:invalid_token",
  MAGIC_LINK_FAILED = "auth:magic_link:failed",
  
  // Configuration errors
  CONFIG_MISSING = "auth:config:missing",
  CONFIG_INVALID = "auth:config:invalid",
  
  // Unknown
  UNKNOWN = "auth:unknown",
}

export enum AuthEvent {
  LOGIN_STARTED = "auth:login:started",
  LOGIN_SUCCESS = "auth:login:success",
  LOGIN_FAILED = "auth:login:failed",
  LOGOUT = "auth:logout",
  SIGNUP_STARTED = "auth:signup:started",
  SIGNUP_SUCCESS = "auth:signup:success",
  SESSION_REFRESHED = "auth:session:refreshed",
  MAGIC_LINK_SENT = "auth:magic_link:sent",
  PASSWORD_RESET_REQUESTED = "auth:password:reset_requested",
  PASSWORD_RESET_STARTED = "auth:password:reset_started",
  PASSWORD_RESET_SUCCESS = "auth:password:reset_success",
}

interface AuthContext {
  userId?: string;
  email?: string;
  provider?: string;
  method?: string;
  locale?: string;
  redirectTo?: string;
  [key: string]: unknown;
}

/**
 * Log an authentication error with structured context
 */
export function logAuthError(
  code: AuthErrorCode,
  error: Error | unknown,
  context: AuthContext = {},
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Create a synthetic error with the auth code
  const trackingError = new Error(`[${code}] ${errorMessage}`);
  if (errorStack) {
    trackingError.stack = errorStack;
  }
  
  captureException(trackingError, {
    tags: {
      auth_code: code,
      auth_provider: context.provider || "unknown",
      auth_method: context.method || "unknown",
      locale: context.locale || "no",
    },
    extra: {
      ...context,
      originalError: errorMessage,
    },
  });
  
  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[Auth Error] ${code}:`, errorMessage, context);
  }
}

/**
 * Log an authentication event (non-error)
 */
export function logAuthEvent(
  event: AuthEvent,
  context: AuthContext = {},
): void {
  captureMessage(`Auth Event: ${event}`, {
    level: "info",
    tags: {
      auth_event: event,
      auth_provider: context.provider || "unknown",
      auth_method: context.method || "unknown",
      locale: context.locale || "no",
    },
    extra: context,
  });
}

/**
 * Set user context for authenticated users
 */
export function setAuthUser(userId: string, email?: string): void {
  setUser({
    id: userId,
    email: email || undefined,
  });
}

/**
 * Clear user context on logout
 */
export function clearAuthUser(): void {
  setUser(null);
}

/**
 * Wrap an async auth function with error tracking
 */
export function withAuthTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorCode: AuthErrorCode,
  context: AuthContext = {},
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logAuthError(errorCode, error, context);
      throw error;
    }
  }) as T;
}

/**
 * Get human-readable error message for auth error codes
 */
export function getAuthErrorMessageForUser(code: AuthErrorCode, locale: string = "no"): string {
  const messages: Record<string, Record<string, string>> = {
    no: {
      [AuthErrorCode.GOOGLE_OAUTH_FAILED]: "Google-innlogging feilet. Prøv igjen eller bruk e-post/passord.",
      [AuthErrorCode.GOOGLE_OAUTH_CANCELLED]: "Innlogging ble avbrutt. Prøv igjen.",
      [AuthErrorCode.GOOGLE_OAUTH_POPUP_BLOCKED]: "Pop-up vinduet ble blokkert. Tillat pop-ups for dette nettstedet.",
      [AuthErrorCode.PKCE_EXCHANGE_FAILED]: "Innlogging feilet (sikkerhetsfeil). Prøv igjen.",
      [AuthErrorCode.PKCE_CODE_MISSING]: "Ingen autorisasjonskode mottatt. Prøv igjen.",
      [AuthErrorCode.EMAIL_LOGIN_FAILED]: "Feil e-post eller passord. Prøv igjen.",
      [AuthErrorCode.SESSION_EXPIRED]: "Økten er utløpt. Vennligst logg inn på nytt.",
      [AuthErrorCode.MAGIC_LINK_FAILED]: "Kunne ikke sende innloggingslenke. Prøv igjen.",
      [AuthErrorCode.CONFIG_MISSING]: "Autentisering er ikke konfigurert. Kontakt support.",
      [AuthErrorCode.UNKNOWN]: "En ukjent feil oppstod. Vennligst prøv igjen.",
    },
    en: {
      [AuthErrorCode.GOOGLE_OAUTH_FAILED]: "Google sign-in failed. Try again or use email/password.",
      [AuthErrorCode.GOOGLE_OAUTH_CANCELLED]: "Sign-in was cancelled. Try again.",
      [AuthErrorCode.GOOGLE_OAUTH_POPUP_BLOCKED]: "Pop-up was blocked. Please allow pop-ups for this site.",
      [AuthErrorCode.PKCE_EXCHANGE_FAILED]: "Sign-in failed (security error). Try again.",
      [AuthErrorCode.PKCE_CODE_MISSING]: "No authorization code received. Try again.",
      [AuthErrorCode.EMAIL_LOGIN_FAILED]: "Invalid email or password. Try again.",
      [AuthErrorCode.SESSION_EXPIRED]: "Session expired. Please sign in again.",
      [AuthErrorCode.MAGIC_LINK_FAILED]: "Could not send login link. Try again.",
      [AuthErrorCode.CONFIG_MISSING]: "Authentication not configured. Contact support.",
      [AuthErrorCode.UNKNOWN]: "An unknown error occurred. Please try again.",
    },
  };
  
  return messages[locale]?.[code] || messages["en"][code] || messages["en"][AuthErrorCode.UNKNOWN];
}
