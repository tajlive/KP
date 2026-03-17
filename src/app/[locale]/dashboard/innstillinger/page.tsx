import { redirect } from "next/navigation";

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Redirect /dashboard/innstillinger → /dashboard/settings
 * so Norwegian URL works (sidebar and links use /dashboard/settings).
 */
export default async function DashboardInnstillingerPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = SUPPORTED_LOCALES.includes(rawLocale as (typeof SUPPORTED_LOCALES)[number])
    ? rawLocale
    : "no";
  redirect(`/${locale}/dashboard/settings`);
}
