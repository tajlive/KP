import { redirect } from 'next/navigation';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Klarpakke Universitet - Norges første krypto-universitet",
  description: "Lær crypto trading fra A til Å. Paper trading simulator med 1M kr virtuell kapital. AI-coach 24/7. Beta-pris: 249 kr (var 499 kr). Kun 50 plasser igjen!",
  keywords: ["trading kurs norge", "lær trading", "paper trading", "krypto utdanning", "norsk trading"],
  openGraph: {
    title: "Klarpakke Universitet - Norges første krypto-universitet",
    description: "Lær crypto trading fra A til Å. Paper trading med 1M kr virtuell kapital.",
    type: "website",
    url: "https://www.klarpakke.no",
  },
};

// Server-side redirect til norsk som default
// Middleware vil overstyre dette basert på Accept-Language for browsere
export default function RootPage() {
  redirect('/no');
}
