/**
 * OAuth Error Handler
 * Provides user-friendly error messages for OAuth failures
 */

export type OAuthError = 
  | "access_denied"
  | "invalid_request"
  | "invalid_scope"
  | "server_error"
  | "temporarily_unavailable"
  | string;

export interface OAuthErrorResult {
  error: OAuthError;
  message: string;
  userMessage: string;
  fixInstructions: string[];
  isRetryable: boolean;
}

const errorMap: Record<string, Omit<OAuthErrorResult, 'error'>> = {
  access_denied: {
    message: "User denied access or app requests unapproved scopes",
    userMessage: "Google-login ble avvist. Appen ber om tilganger som må godkjennes.",
    fixInstructions: [
      "Gå til https://console.cloud.google.com/apis/credentials/consent",
      "Sjekk at alle 'Sensitive scopes' er godkjent (hvis du bruker dem)",
      "ELLER fjern sensitive scopes fra Supabase: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/providers",
      "Kontakt support@klarpakke.no hvis problemet vedvarer"
    ],
    isRetryable: true,
  },
  invalid_request: {
    message: "Invalid request parameters",
    userMessage: "Ugyldig forespørsel. Prøv igjen.",
    fixInstructions: [
      "Tøm nettleser-cookies for klarpakke.no",
      "Prøv å logge inn på nytt"
    ],
    isRetryable: true,
  },
  invalid_scope: {
    message: "Invalid scope requested",
    userMessage: "Ugyldig tilgangsforespørsel.",
    fixInstructions: [
      "Kontakt support@klarpakke.no"
    ],
    isRetryable: false,
  },
  server_error: {
    message: "OAuth server error",
    userMessage: "Midertidig feil hos Google. Prøv igjen om noen minutter.",
    fixInstructions: [
      "Vent 5 minutter og prøv igjen",
      "Hvis problemet vedvarer, kontakt support"
    ],
    isRetryable: true,
  },
  temporarily_unavailable: {
    message: "Service temporarily unavailable",
    userMessage: "Tjenesten er midertidig utilgjengelig. Prøv igjen senere.",
    fixInstructions: [
      "Vent noen minutter og prøv igjen"
    ],
    isRetryable: true,
  },
};

export function handleOAuthError(
  error: OAuthError,
  locale: string = "no"
): OAuthErrorResult {
  const defaultResult = {
    message: "Unknown OAuth error",
    userMessage: "En uventet feil oppstod. Prøv igjen.",
    fixInstructions: [
      "Tøm nettleser-cookies",
      "Prøv å logge inn på nytt",
      "Kontakt support@klarpakke.no hvis problemet vedvarer"
    ],
    isRetryable: true,
  };

  const result = errorMap[error] || defaultResult;
  
  // English messages
  if (locale === "en") {
    if (error === "access_denied") {
      return {
        error,
        ...result,
        userMessage: "Google login was denied. The app is requesting scopes that need approval.",
        fixInstructions: [
          "Go to https://console.cloud.google.com/apis/credentials/consent",
          'Check that any "Sensitive scopes" are approved (if using them)',
          'OR remove sensitive scopes from Supabase Dashboard',
          "If the problem persists, contact support@klarpakke.no"
        ],
      };
    }
  }

  return {
    error,
    ...result,
  };
}

export function getErrorRedirectUrl(
  errorResult: OAuthErrorResult,
  locale: string,
  baseUrl: string
): URL {
  const url = new URL(`/${locale}/innlogging`, baseUrl);
  url.searchParams.set("error", "oauth_failed");
  url.searchParams.set("detail", errorResult.error);
  url.searchParams.set("message", errorResult.userMessage);
  url.searchParams.set("retryable", errorResult.isRetryable ? "1" : "0");
  
  // Add fix instructions as JSON
  const instructions = JSON.stringify(errorResult.fixInstructions);
  // Only add if not too long (URL limit)
  if (instructions.length < 500) {
    url.searchParams.set("fix", instructions);
  }
  
  return url;
}
