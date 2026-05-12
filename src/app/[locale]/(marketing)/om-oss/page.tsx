import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import OmOssClient from "./OmOssClient";

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.metadata" });
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.klarpakke.no/${locale}/om-oss`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function OmOssPage() {
  return <OmOssClient />;
}
