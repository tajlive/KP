import { requireAuth } from "@/lib/auth-guard";
import type { Metadata } from "next";
import StrategiesBrowseClient from "./StrategiesBrowseClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Strategier" : "Strategies",
    description: isNo
      ? "Utforsk og administrer strategier tilknyttet markedsplassen."
      : "Browse and manage strategies for the marketplace.",
  };
}

export default async function DashboardStrategiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale);

  return <StrategiesBrowseClient locale={locale} />;
}
