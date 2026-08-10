import { getTranslations } from "next-intl/server";
import KursPilot from "@/components/kurs/KursPilot";

export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * /kurs — «Pilot-løpet»: 4 moduler (mega-plan Oppgave 1.2, 2026-08-10).
 *
 * Erstatter den DB-drevne kurskatalog-visningen (badges/kurskort).
 * Leksjonsrutene under /kurs/[moduleSlug] lever videre og lenkes til
 * fra modul 1 og 2. Gammel katalogkode ligger i git-historikken.
 */
export default async function KursPage({ params }: PageProps) {
  await params; // locale hentes av KursPilot via useLocale()
  return <KursPilot />;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kursPage" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    openGraph: {
      title: t("metadataTitle"),
      description: t("metadataDescription"),
      type: "website",
      url: `https://www.klarpakke.no/${locale}/kurs`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadataTitle"),
      description: t("metadataDescription"),
    },
  };
}
