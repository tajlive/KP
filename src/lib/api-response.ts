/**
 * Felles API-response og feilformat (audit 4.3).
 * Standard format: { error?: string, code?: string } for feil;
 * suksess returnerer data direkte eller { data }.
 */

import { NextResponse } from "next/server";

export const API_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL_ERROR",
  MARKET_PRICE_ERROR: "MARKET_PRICE_ERROR",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  ALREADY_COMPLETED: "ALREADY_COMPLETED",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
}

/** Standard suksess – JSON med data og 200 (eller annen status). */
export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Standard feil – { error, code? } og valgfri status.
 * Letter frontend-feilhåndtering og Sentry (code kan brukes som tag).
 */
export function jsonError(
  message: string,
  options?: { code?: ApiErrorCode; status?: number },
): NextResponse {
  const status = options?.status ?? 500;
  const body: ApiErrorBody = { error: message };
  if (options?.code) body.code = options.code;
  return NextResponse.json(body, { status });
}

/** 401 Ikke autentisert */
export function unauthorized(message = "Ikke autentisert"): NextResponse {
  return jsonError(message, {
    code: API_ERROR_CODES.UNAUTHORIZED,
    status: 401,
  });
}

/** 403 Ikke tilgang */
export function forbidden(message = "Ingen tilgang"): NextResponse {
  return jsonError(message, { code: API_ERROR_CODES.FORBIDDEN, status: 403 });
}

/** 404 Ikke funnet */
export function notFound(message = "Ikke funnet"): NextResponse {
  return jsonError(message, { code: API_ERROR_CODES.NOT_FOUND, status: 404 });
}

/** 400 Ugyldig forespørsel */
export function badRequest(
  message = "Ugyldig forespørsel",
  code?: ApiErrorCode,
): NextResponse {
  return jsonError(message, {
    code: code ?? API_ERROR_CODES.BAD_REQUEST,
    status: 400,
  });
}

/** 409 Konflikt (f.eks. allerede fullført) */
export function conflict(message: string, code?: ApiErrorCode): NextResponse {
  return jsonError(message, {
    code: code ?? API_ERROR_CODES.CONFLICT,
    status: 409,
  });
}

/** 500 Intern feil */
export function internalError(
  message = "Uventet feil",
  options?: { code?: ApiErrorCode },
): NextResponse {
  return jsonError(message, {
    code: options?.code ?? API_ERROR_CODES.INTERNAL,
    status: 500,
  });
}
