



import { locales } from '@/i18n/config';
import BetaDashboardClient from './BetaDashboardClient';


export const dynamic = 'force-dynamic'

export default async function BetaDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  return <BetaDashboardClient params={resolvedParams} />;
}
