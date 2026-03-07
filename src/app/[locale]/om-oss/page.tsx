import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import OmOssClient from "./OmOssClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function OmOssPage() {
  return <OmOssClient />;
}
