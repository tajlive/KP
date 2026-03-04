export const dynamic = 'force-dynamic';

/**
 * Auto Trade Dashboard
 * Hovedside for administrasjon av auto trading-strategier
 * 
 * Tier-grenser:
 * - Student: 0 strategier, KUN paper, 1 posisjon
 * - Bachelor: 1 strategi, paper + live, 3 posisjoner
 * - Master: 3 strategier, paper + live, 7 posisjoner
 * - PhD/Professor: ubegrenset, paper + live, ubegrenset
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ClientAutoTradeDashboard from './ClientAutoTradeDashboard';

export async function generateMetadata({ 
  params
}: { 
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'autoTrade' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}

export default function AutoTradePage() {
  return <ClientAutoTradeDashboard />;
}
