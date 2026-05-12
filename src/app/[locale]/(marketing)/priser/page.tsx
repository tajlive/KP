import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PriserClient from "./PriserClient";

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing.metadata" });
  const title = t("title");
  const description = t("description");

  return {
    title,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.klarpakke.no/${locale}/priser`,
      images: [
        { url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PriserPage() {
  return <PriserClient />;
}
