import type { Metadata } from "next";
import RegisterPage from "./RegisterClient";

export const metadata: Metadata = {
  title: "Registrer deg",
  description:
    "Opprett konto på Klarpakke — Norges krypto-skole. Start med 100 000 kr i lekepenger, lær kryptohandel med AI-drevne verktøy helt gratis.",
  openGraph: {
    title: "Registrer deg | Klarpakke — Norges krypto-skole",
    description:
      "Opprett konto på Klarpakke — Norges krypto-skole. Start med 100 000 kr i lekepenger, lær kryptohandel med AI-drevne verktøy helt gratis.",
  },
};

export default function Page() {
  return <RegisterPage />;
}
