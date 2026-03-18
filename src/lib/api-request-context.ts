/**
 * Request-kontekst for API: request-id, user-id, route (audit 4.6).
 * Bruk getRequestContext() i route handlers for strukturert logging.
 */

const HEADER_REQUEST_ID = "x-request-id";

/** Request-liknende med headers og url (NextRequest eller Request). */
type RequestLike = { headers: Headers; method: string; url: string };

/** Generer en enkel request-id hvis ikke satt fra load balancer/proxy. */
export function getOrCreateRequestId(request: RequestLike): string {
  const fromHeader = request.headers.get(HEADER_REQUEST_ID);
  if (fromHeader) return fromHeader;
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface RequestContext {
  requestId: string;
  path: string;
  method: string;
  userId?: string;
}

/**
 * Hent kontekst for nåværende request (kall fra route med request + valgfri userId).
 */
export function getRequestContext(
  request: RequestLike,
  userId?: string | null,
): RequestContext {
  const requestId = getOrCreateRequestId(request);
  const path = request.url ? new URL(request.url).pathname : "";
  return {
    requestId,
    path,
    method: request.method,
    userId: userId ?? undefined,
  };
}

/**
 * Strukturert logglinje for API – inkluder requestId, userId, route.
 */
export function logApi(
  ctx: RequestContext,
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
): void {
  const payload = {
    requestId: ctx.requestId,
    path: ctx.path,
    method: ctx.method,
    ...(ctx.userId && { userId: ctx.userId }),
    ...extra,
  };
  const line = JSON.stringify({ level, message, ...payload });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
