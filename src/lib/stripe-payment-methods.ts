/**
 * Hjelpefunksjoner for betalingsmetoder i Stripe Checkout.
 * Brukerflate viser Vipps kun for NO/SE/DK/FI; ellers Stripe-merker (Visa, MC, PayPal m.m.).
 * Faktiske metoder i sesjon styres av Stripe Dashboard og PaymentElement / Checkout-innstillinger.
 */

/**
 * Gyldige metoder for legacy/kode som forventer en liste — kort er alltid en del av Stripe-flyten.
 */
export async function getValidPaymentMethods(): Promise<string[]> {
  // Stripe kortbetaling er alltid tilgjengelig
  return ["card"];
}

/**
 * Sjekker om brukeren er i Norge
 * Brukes for å vise lokal tilpasning (priser i NOK, norsk tekst)
 */
export function isNorwegianContext(req?: Request): boolean {
  if (!req) return true; // Default til norsk for SSR

  const acceptLanguage = req.headers.get("accept-language") || "";
  const country =
    req.headers.get("cf-ipcountry") || // Cloudflare
    req.headers.get("x-vercel-ip-country") || // Vercel
    "";

  // Sjekk norsk språk eller Norge som land
  return (
    acceptLanguage.includes("nb") ||
    acceptLanguage.includes("no") ||
    country === "NO"
  );
}
