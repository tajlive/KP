import { redirect } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/i18n/config";

export const runtime = 'nodejs';

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
