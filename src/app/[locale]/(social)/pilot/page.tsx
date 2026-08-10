import PilotDashboard from "@/features/pilot/PilotDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Din Pilot — Klarpakke",
  description:
    "Én knapp. Én pilot. Null innstillinger. Piloten handler med lekepenger og forklarer hvert steg på norsk.",
};

/**
 * /pilot — Variant B «Dagboken» (Tom-valgt design 2026-08-10).
 * Erstatter redirecten til /trade. Utloggede får login/register-prompt
 * i komponenten (401-håndtering), innloggede får ekte dashboard.
 */
export default function PilotPage() {
  return <PilotDashboard />;
}
