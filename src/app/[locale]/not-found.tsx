import { cookies } from "next/headers";
import type { Metadata } from "next";
import { NotFoundClient } from "./NotFoundClient";

// P2 (2026-08-10): 404-siden arvet landing-tittelen
// («Klarpakke — AI-trading med lekepenger | Klarpakke» — dobbel Klarpakke).
// generateMetadata krever server-komponent; UI-en ligger i NotFoundClient.
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value ?? "no";
  const isEn = locale === "en";
  return {
    title: isEn ? "Siden finnes ikke" : "Page not found",
    robots: { index: false, follow: false },
  };
}

export default function NotFound() {
  return <NotFoundClient />;
}
