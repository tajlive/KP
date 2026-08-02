import { Metadata } from "next";
import ClientForbidden from "./ClientForbidden";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Ingen tilgang (403)",
  description:
    "Du har ikke tilgang til denne siden på Klarpakke. Logg inn eller kontakt support for hjelp.",
};

export default function ForbiddenPage() {
  return <ClientForbidden />;
}
