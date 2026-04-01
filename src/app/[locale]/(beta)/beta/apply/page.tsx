



import BetaApplyClient from './BetaApplyClient';


export const dynamic = 'force-dynamic';

export default async function BetaApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  return <BetaApplyClient params={resolvedParams} />;
}
