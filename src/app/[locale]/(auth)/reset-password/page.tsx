import type { Metadata } from "next";
import ResetPasswordPage from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Tilbakestill passord",
  description:
    "Tilbakestill passordet ditt på Klarpakke. Få tilsendt en lenke for å opprette et nytt passord og gjenoppta kryptohandelen.",
  openGraph: {
    title: "Tilbakestill passord | Klarpakke — Norges krypto-skole",
    description:
      "Tilbakestill passordet ditt på Klarpakke. Få tilsendt en lenke for å opprette et nytt passord og gjenoppta kryptohandelen.",
  },
};

export default function Page() {
  return <ResetPasswordPage />;
}
