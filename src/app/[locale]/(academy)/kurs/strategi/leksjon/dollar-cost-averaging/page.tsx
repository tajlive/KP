import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dollar-Cost Averaging (DCA)",
  description:
    "Lær om Dollar-Cost Averaging (DCA) — en av de mest effektive strategiene for kryptoinvestering. Spar jevnt og reduser risikoen for å kjøpe på feil tidspunkt.",
  openGraph: {
    title: "Dollar-Cost Averaging (DCA) | Klarpakke — Norges krypto-skole",
    description:
      "Lær om Dollar-Cost Averaging (DCA) — spar jevnt og reduser risikoen for å kjøpe på feil tidspunkt.",
  },
};

export default function LeksjonPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dollar-Cost Averaging (DCA)</h1>
      <p className="text-muted-foreground">Dette innholdet er under utvikling. Kom tilbake senere!</p>
    </div>
  );
}
