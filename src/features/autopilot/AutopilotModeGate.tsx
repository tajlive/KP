"use client";

import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";
import { AutopilotDashboard } from "./AutopilotDashboard";

/**
 * AutopilotModeGate — P1.2 (2026-08-11).
 *
 * Kraken Autopilot-panelet viser EKTE penger ($-equity, live-ordrer).
 * Før denne gaten rendret det også i Lekepenger-modus → brukeren så
 * live-tall mens toggelen viste «Lekepenger». Nå: streng skill mellom
 * paper og live — panelet finnes kun i live-modus.
 */
export function AutopilotModeGate({ userId }: { userId: string }) {
  const { mode } = useCockpit();
  if (mode !== "live") return null;
  return <AutopilotDashboard userId={userId} />;
}
