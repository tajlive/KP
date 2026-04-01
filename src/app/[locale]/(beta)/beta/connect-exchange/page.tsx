



import ConnectExchangeClient from './ConnectExchangeClient';


export const dynamic = 'force-dynamic'

export default async function ConnectExchangePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  return <ConnectExchangeClient params={resolvedParams} />;
}
