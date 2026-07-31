import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "JokerTrade / Pilot",
  description:
    "Din personlige AI-trader — automatisk analyse og intelligente signaler. Start gratis med 100 000 kr i lekepenger.",
};

/**
 * Pilot er nå en integrert del av Trade-siden.
 * Redirecter til /trade?mode=joker for enklere brukeropplevelse.
 */
export default function JokerTradePage() {
  redirect("/trade?first=1");
}
