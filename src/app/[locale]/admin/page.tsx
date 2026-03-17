import { redirect } from "next/navigation";

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = SUPPORTED_LOCALES.includes(rawLocale as (typeof SUPPORTED_LOCALES)[number])
    ? rawLocale
    : "no";
  redirect(`/${locale}/admin/analytics`);
}
