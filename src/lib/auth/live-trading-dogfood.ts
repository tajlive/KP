/**
 * Live Trading Dogfood Gate
 *
 * Tom-beslutning 2026-08-12: Live trading er intern dogfood.
 * Kun tomarnejensen@gmail.com (0dd08529-b8a8-4fd3-9806-275e2d0135dd)
 * skal kunne starte, se eller bruke live-trading mens P0 pengeintegritet
 * håndteres.
 *
 * Denne modulen er den ENESTE autoritative kilden for live-tilgang.
 * Alle ruter, komponenter og guards som sjekker live-tilgang MÅ gå via
 * funksjonene her. Feature-flag NEXT_PUBLIC_LIVE_TRADING_DOGFOOD=true
 * aktiverer sperren.
 */

/**
 * Tom Arne Jensen — eneste live trading testkonto.
 * UUID fra auth.users (via migrations/seed).
 */
export const DOGFOOD_USER_IDS: ReadonlySet<string> = new Set([
  "0dd08529-b8a8-4fd3-9806-275e2d0135dd",
]);

/**
 * Er dogfood-modus aktivert?
 * Krever NEXT_PUBLIC_LIVE_TRADING_DOGFOOD=true i miljø.
 * Default false = dogfood-sperre er AV (alle kan live hvis entitlement).
 */
export function isLiveTradingDogfood(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_TRADING_DOGFOOD === "true";
}

/**
 * Kan denne brukeren bruke live trading?
 *
 * Sjekker:
 * 1. Er dogfood aktivert? Hvis nei → alle slippes gjennom (gammel oppførsel)
 * 2. Er bruker i whitelist? → slipper gjennom
 * 3. Ellers → blokkert
 *
 * Dette er KUN dogfood-gaten. verifyLiveEntitlement() sjekker i tillegg
 * tier, exchange-nøkler og entitlements for whitelistede brukere.
 */
export function canUserAccessLiveTrading(userId: string): boolean {
  if (!isLiveTradingDogfood()) {
    return true; // Dogfood av — gammel oppførsel
  }
  return DOGFOOD_USER_IDS.has(userId);
}

/**
 * Hvorfor er live trading utilgjengelig?
 * Returnerer null hvis tilgang er OK, eller en brukervennlig norsk melding.
 */
export function liveTradingBlockReason(userId: string): string | null {
  if (canUserAccessLiveTrading(userId)) return null;
  return "Live trading er for øyeblikket kun tilgjengelig for testbrukere.";
}
