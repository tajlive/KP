import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ClientKontakt from "./ClientKontakt";

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  
  return {
    title: "Kontakt oss | Klarpakke",
    description: "Har du spørsmål om kurs, trading eller konto? Kontakt Klarpakke-teamet. Vi svarer vanligvis innen 24 timer.",
  };
}

export default function KontaktPage() {
  return <ClientKontakt />;
}
