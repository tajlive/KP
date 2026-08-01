import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pilot — Folkets AI-pilot",
  description:
    "Din personlige AI-trader — automatisk analyse og intelligente signaler. Start gratis med 100 000 kr i lekepenger.",
};

/**
 * Pilot er nå en integrert del av Trade-siden (se /jokertrade).
 * Redirecter til /trade?first=1 for enklere brukeropplevelse.
 */
export default function PilotPage() {
  redirect("/trade?first=1");
}
