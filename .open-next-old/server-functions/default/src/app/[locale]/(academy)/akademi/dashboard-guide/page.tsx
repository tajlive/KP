import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard-guide",
  description:
    "Lær å lese Klarpakkes dashboard-tall. Forstå portefølje, PnL, risikoscore og trading-innsikter — slik at du tar bedre handelsbeslutninger.",
  openGraph: {
    title: "Dashboard-guide | Klarpakke — Norges krypto-skole",
    description:
      "Lær å lese Klarpakkes dashboard-tall. Forstå portefølje, PnL, risikoscore og trading-innsikter.",
  },
};

export default function DashboardGuidePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Slik leser du dashboard-tallene</h1>
      <p className="text-muted-foreground">Denne guiden er under utvikling. Kom tilbake senere!</p>
    </div>
  );
}
