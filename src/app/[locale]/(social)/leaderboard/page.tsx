import { Metadata } from "next";
import CompetitionClient from "@/features/leaderboard/CompetitionClient";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ledertavle",
  description:
    "Se hvem som leder på Klarpakkes ledertavle. Følg topptradere, sammenlign resultater og klatre i rankingen — hele veien til topps.",
  openGraph: {
    title: "Ledertavle | Klarpakke — Norges krypto-skole",
    description:
      "Se hvem som leder på Klarpakkes ledertavle. Følg topptradere, sammenlign resultater og klatre i rankingen.",
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Leaderboard page – reuses CompetitionClient for full leaderboard UI.
 * Fikser 404 fra lenker i KLTWallet, MonthlyCompetitionBanner, sitemap, e-post.
 * Ref: docs/ANALYSE-RUTER-DESIGN-SIGNALER-2026.md P0#1
 */
export default async function LeaderboardPage({ params }: PageProps) {
  const { locale } = await params;
  return <CompetitionClient params={{ locale }} />;
}
