import UnifiedTradingDashboard from '@/components/trading/UnifiedTradingDashboard';

export const metadata = {
  title: 'Trading Dashboard - Klarpakke',
  description: 'Ditt personlige trading dashboard med paper trading, live trading og avanserte verktøy for krypto-handel',
};

export default function TradingPage() {
  return <UnifiedTradingDashboard />;
}
