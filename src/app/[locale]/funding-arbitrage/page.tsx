import type { Metadata } from 'next';
import FundingArbitrageDashboard from '@/features/funding/FundingArbitrageDashboard';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Funding Arbitrage | Klarpakke',
  description: 'Analyseverktøy for funding rate arbitrage. Historiske tall, ingen garanti for fremtidig avkastning.',
};

export default function FundingArbitragePage() {
  return (
    <div className="min-h-screen h-full max-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <FundingArbitrageDashboard />
    </div>
  );
}
