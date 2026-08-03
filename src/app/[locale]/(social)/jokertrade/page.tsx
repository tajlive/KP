import { permanentRedirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pilot — Folkets AI-pilot",
  description:
    "Din personlige AI-trader — automatisk analyse og intelligente signaler. Start gratis med 100 000 kr i lekepenger.",
};

/**
 * JokerTrade er avviklet (vedtatt 2026-08-03) — heter nå Pilot.
 * 301 permanent redirect til /pilot (som viderefører til /trade?first=1).
 * permanentRedirect gir HTTP 308 (permanent, metode-beholdende) —
 * SEO-ekvivalent til 301 for GET.
 */
export default function JokerTradePage() {
  permanentRedirect("/pilot");
}
