



import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { Metadata } from 'next';
import TaxReportClient from './TaxReportClient';

export const metadata: Metadata = {
  title: 'Skatterapport | Klarpakke',
  description: 'Generer skatterapport for krypto-handel',
};

export const dynamic = 'force-dynamic';

export default async function TaxReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale, localizedPathname(locale, "/dashboard/tax-report"));
  return <TaxReportClient />;
}
