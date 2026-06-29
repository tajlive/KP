/**
 * Vipps tilbys kun i markeder der produktet er ment brukt (Norden).
 * Geo hentes fra Cloudflare der tilgjengelig.
 */

const VIPPS_MARKETS = new Set(["NO", "SE", "DK", "FI"]);

export function isVippsMarketCountry(
  countryCode: string | null | undefined,
): boolean {
  const c = countryCode?.trim().toUpperCase() ?? "";
  return VIPPS_MARKETS.has(c);
}

export function countryFromRequestHeaders(headers: Headers): string | null {
  const raw =
    headers.get("cf-ipcountry") ||
    headers.get("CloudFront-Viewer-Country") ||
    "";
  const c = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

/**
 * UI + API: vis / tillat Vipps når land er NO/SE/DK/FI.
 * Ukjent land: ikke nordisk i prod (unngår feilaktig Vipps for Thailand m.m.).
 * I development tillates manglende geo for lokal testing uten IP-headers.
 */
export function shouldShowVippsForRequest(headers: Headers): boolean {
  const country = countryFromRequestHeaders(headers);
  if (isVippsMarketCountry(country)) return true;
  if (!country && process.env.NODE_ENV === "development") return true;
  return false;
}
