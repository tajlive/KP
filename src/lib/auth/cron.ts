import { NextRequest } from "next/server";

/**
 * Validates that the request carries the correct CRON_SECRET via the
 * `Authorization: Bearer <secret>` header.
 *
 * - Trims both the supplied header value and the configured CRON_SECRET.
 * - The "Bearer" prefix is matched case-insensitively; the secret itself is
 *   compared case-sensitively.
 * - Does NOT fall back to `?secret=` query parameters (removed for security).
 *
 * In development, when CRON_SECRET is not set, the function returns `true` to
 * simplify local testing. In production a configured secret is required.
 */
export function validateCronSecret(request: NextRequest | Request): boolean {
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (process.env.NODE_ENV === "development" && !expectedSecret) {
    return true;
  }

  if (!expectedSecret) {
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const bearerPrefix = "Bearer ";
  if (!authHeader.toLowerCase().startsWith(bearerPrefix.toLowerCase())) {
    return false;
  }

  const suppliedSecret = authHeader.slice(bearerPrefix.length).trim();
  return suppliedSecret === expectedSecret;
}
