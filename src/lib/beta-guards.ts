import { NextResponse } from "next/server";

/**
 * Beta payments/live guards — kundevendt sperring (2026-08-12).
 *
 * Produktpolicy: Klarpakke er i beta. Betaling, abonnement og
 * live-handel med ekte penger er IKKE tilgjengelig for kunder ennå.
 * Intern dogfood-konfigurasjon røres aldri — kun kundevendte endepunkter.
 */

/** Fast responskode for betalings-/abonnementssperre (P0). */
export const BETA_PAYMENTS_DISABLED = "BETA_PAYMENTS_DISABLED";

/** Fast responskode for live-handelssperre (P0). */
export const BETA_LIVE_TRADING_DISABLED = "BETA_LIVE_TRADING_DISABLED";

/**
 * 503/403-guard for betalingsendepunkter.
 * Returnerer alltid sperret respons — ingen kort, ingen checkout.
 */
export function betaPaymentsDisabled(): NextResponse {
  return NextResponse.json(
    {
      error: BETA_PAYMENTS_DISABLED,
      message:
        "Betaling og abonnement er ikke åpnet i beta. Du kan bruke lekepenger gratis.",
    },
    { status: 403 },
  );
}

/**
 * Guard for kundevendte live-start-endepunkter.
 * Klienten skal vise beta-forklaringen («Live-handel er ikke tilgjengelig
 * i beta») ved BETA_LIVE_TRADING_DISABLED.
 */
export function betaLiveTradingDisabled(): NextResponse {
  return NextResponse.json(
    {
      error: BETA_LIVE_TRADING_DISABLED,
      message:
        "Live-handel er ikke tilgjengelig i beta. Du kan øve med lekepenger på ekte markedsdata.",
    },
    { status: 403 },
  );
}
