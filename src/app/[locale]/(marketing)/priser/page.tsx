import { PriserContent } from "./PriserContent";
import { MarketingPageShell } from "@/shared/ui/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Priser — Velg din trading-plan",
    description: "Start gratis, oppgrader når du er klar. Alle planer inkluderer papirhandel og AI-signaler.",
  };
}

export default async function PriserPage() {
  return (
    <MarketingPageShell>
      <PriserContent locale="no" showVipps={false} />
    </MarketingPageShell>
  );
}
