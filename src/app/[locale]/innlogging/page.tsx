



import { InnloggingClient } from './InnloggingClient'
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('login.title'),
    description: t('login.description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function InnloggingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111] flex items-center justify-center"><div className="text-white">Laster...</div></div>}>
      <InnloggingClient />
    </Suspense>
  )
}
