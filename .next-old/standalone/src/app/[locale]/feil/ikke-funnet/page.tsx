import { Metadata } from "next";
import ClientNotFound from "./ClientNotFound";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Ikke funnet (404)",
  description:
    "Siden du leter etter finnes ikke på Klarpakke. Bruk menyen for å navigere til riktig side.",
};

export default function NotFoundPage() {
  return <ClientNotFound />;
}
