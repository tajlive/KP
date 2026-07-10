import type { Metadata } from "next";
import TraderRoute from "./TraderClient";

export const metadata: Metadata = {
  title: "Trader-profil",
  description:
    "Se traderens profil på Klarpakke — følg deres handler, resultater og kopier strategien. Lær av de beste i Norges krypto-skole.",
  openGraph: {
    title: "Trader-profil | Klarpakke — Norges krypto-skole",
    description:
      "Se traderens profil på Klarpakke — følg deres handler, resultater og kopier strategien.",
  },
};

export default function Page() {
  return <TraderRoute />;
}
