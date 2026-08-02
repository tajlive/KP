import { Metadata } from "next";
import ClientServerError from "./ClientServerError";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Serverfeil (500)",
  description:
    "Beklager, det oppstod en teknisk feil på Klarpakke. Vi jobber med å løse problemet. Prøv igjen om litt.",
};

export default function ServerErrorPage() {
  return <ClientServerError />;
}
