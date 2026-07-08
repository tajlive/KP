import { PriserContent } from "./PriserContent";

export const runtime = "nodejs";

export async function generateMetadata() {
  return {
    title: "Priser — Velg din trading-plan | Klarpakke",
    description: "Start gratis, oppgrader når du er klar. Alle planer inkluderer papirhandel og AI-signaler.",
  };
}

export default function PriserPage() {
  return <PriserContent />;
}
