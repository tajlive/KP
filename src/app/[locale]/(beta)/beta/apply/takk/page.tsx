



import { Suspense } from 'react';
import BetaThankYouClient from './BetaThankYouClient';


export const dynamic = 'force-dynamic';

export default async function BetaApplicationThankYou({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <BetaThankYouClient locale={locale} />
    </Suspense>
  );
}
