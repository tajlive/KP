/**
 * Hjelpefunksjoner for å håndtere betalingsmetoder i Stripe
 * 
 * Klarpakke bruker kun Stripe for betalinger.
 * Støttede metoder: Card, Apple Pay, Google Pay
 */

/**
 * Får gyldige betalingsmetoder
 * Klarpakke støtter alltid kortbetaling via Stripe
 */
export async function getValidPaymentMethods(): Promise<string[]> {
  // Stripe kortbetaling er alltid tilgjengelig
  return ['card'];
}

/**
 * Sjekker om brukeren er i Norge
 * Brukes for å vise lokal tilpasning (priser i NOK, norsk tekst)
 */
export function isNorwegianContext(req?: Request): boolean {
  if (!req) return true; // Default til norsk for SSR
  
  const acceptLanguage = req.headers.get('accept-language') || '';
  const country = req.headers.get('cf-ipcountry') || // Cloudflare
                  req.headers.get('x-vercel-ip-country') || // Vercel
                  '';
  
  // Sjekk norsk språk eller Norge som land
  return acceptLanguage.includes('nb') || 
         acceptLanguage.includes('no') || 
         country === 'NO';
}
