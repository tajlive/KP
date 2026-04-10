import { NextRequest, NextResponse } from "next/server";

export type OAuthErrorResult = {
  error: string;
  description: string;
};

export function handleOAuthError(error: string): OAuthErrorResult {
  const errorMessages: Record<string, string> = {
    access_denied: "Bruker avbrøt innloggingen",
    invalid_scope: "Ugyldig OAuth scope",
    invalid_request: "Ugyldig forespørsel",
    unsupported_response_type: "Ustøttet respons-type",
    invalid_grant: "Ugyldig autorisasjonskode",
    unauthorized_client: "Uautorisert klient",
    server_error: "Serverfeil hos innloggingsleverandør",
    temporarily_unavailable: "Tjenesten er midlertidig utilgjengelig",
  };

  return {
    error,
    description: errorMessages[error] || "OAuth feil",
  };
}

export function getErrorRedirectUrl(
  errorResult: OAuthErrorResult,
  locale: string,
  origin: string,
): URL {
  const url = new URL(`/${locale}/innlogging`, origin);
  url.searchParams.set("error", errorResult.error);
  url.searchParams.set("detail", errorResult.description);
  return url;
}
