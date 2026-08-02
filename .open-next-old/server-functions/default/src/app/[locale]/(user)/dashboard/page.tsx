import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DashboardClient from "./DashboardClient";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("dashboard.title"),
    description: t("dashboard.description"),
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <DashboardClient locale={locale} />;
}
