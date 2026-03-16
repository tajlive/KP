import UnifiedTradingDashboard from '@/components/trading/UnifiedTradingDashboard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'no'
      ? 'Trading Dashboard - Klarpakke'
      : 'Trading Dashboard - Klarpakke',
    description: locale === 'no'
      ? 'Ditt personlige trading dashboard med lekepenger, live trading og avanserte verktøy for krypto-handel'
      : 'Your personal trading dashboard with paper money, live trading and advanced tools for crypto trading',
  };
}

export default function TradingPage() {
  return <UnifiedTradingDashboard />;
}
