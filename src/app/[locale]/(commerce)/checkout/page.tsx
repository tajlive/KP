import type { Metadata } from "next";
import { BetaPricingPage } from "@/components/BetaPricingPage";

export const runtime = "nodejs";

/**
 * /checkout — P0 kundevendt (2026-08-12): beta.
 * Betaling er ikke åpent. Alle checkout-varianter (plan/kurs/sesjon)
 * viser samme beta-informasjonsside — ingen skjema, ingen kortfelt,
 * ingen betalingsintegrasjon. CTA → /register.
 * Gamle CheckoutContent/ClientCheckout ligger urørt til betaling åpner.
 */
export const metadata: Metadata = {
  title: "Betaling kommer senere | Klarpakke",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; course?: string; session_id?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  // Alle checkout-varianter → beta-side. Uten plan/kurs/sesjon → /priser
  // (som også er beta-siden). Ingen kundevendt rute når betalingslogikk.
  void sp;
  void locale;

  return <BetaPricingPage />;
}
