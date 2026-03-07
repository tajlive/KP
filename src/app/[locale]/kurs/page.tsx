import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ClientKurs from "./ClientKurs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("courses.title"),
    description: t("courses.description"),
  };
}

export default function KursPage() {
  return <ClientKurs />;
}
