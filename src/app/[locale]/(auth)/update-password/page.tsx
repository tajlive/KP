import type { Metadata } from "next";
import UpdatePasswordPage from "./UpdatePasswordClient";

export const metadata: Metadata = {
  title: "Oppdater passord",
  description:
    "Opprett et nytt passord for Klarpakke-kontoen din. Sikre kontoen med et sterkt passord og kom raskt tilbake til handelen.",
  openGraph: {
    title: "Oppdater passord | Klarpakke — Norges krypto-skole",
    description:
      "Opprett et nytt passord for Klarpakke-kontoen din. Sikre kontoen med et sterkt passord og kom raskt tilbake til handelen.",
  },
};

export default function Page() {
  return <UpdatePasswordPage />;
}
