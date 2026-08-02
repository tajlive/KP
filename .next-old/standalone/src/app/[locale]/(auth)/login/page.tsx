import type { Metadata } from "next";
import LoginPage from "./LoginClient";

export const metadata: Metadata = {
  title: "Logg inn",
  description:
    "Logg inn på Klarpakke — Norges krypto-skole. Få tilgang til AI-drevne handelsverktøy, lekepenger-simulator og ditt personlige dashbord.",
  openGraph: {
    title: "Logg inn | Klarpakke — Norges krypto-skole",
    description:
      "Logg inn på Klarpakke — Norges krypto-skole. Få tilgang til AI-drevne handelsverktøy, lekepenger-simulator og ditt personlige dashbord.",
  },
};

export default function Page() {
  return <LoginPage />;
}
