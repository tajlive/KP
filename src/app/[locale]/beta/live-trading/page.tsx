



import LiveTradingClient from './LiveTradingClient';


export const dynamic = 'force-dynamic'

export default async function LiveTradingPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  return <LiveTradingClient params={resolvedParams} />;
}
