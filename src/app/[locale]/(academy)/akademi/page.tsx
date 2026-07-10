
import { Metadata } from "next";
import ClientAkademi from "./ClientAkademi";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Akademi",
  description:
    "Klarpakke Akademi — lær kryptovaluta fra bunnen av. Gratis kurs i kryptohandel, blockchain-teknologi og trading-strategier for nybegynnere og viderekomne.",
  openGraph: {
    title: "Akademi | Klarpakke — Norges krypto-skole",
    description:
      "Klarpakke Akademi — lær kryptovaluta fra bunnen av. Gratis kurs i kryptohandel, blockchain og trading-strategier.",
  },
};

export default function Page() {
  return <ClientAkademi />;
}
