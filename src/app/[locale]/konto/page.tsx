



import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LommebokDashboard } from './LommebokDashboard'

export const metadata: Metadata = {
  title: 'Lommebok - Klarpakke Universitet',
  description: 'Din personlige lommebok for krypto-trading'
}


export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LommebokPage({ params }: PageProps) {
  const { locale } = await params;
  
  // Hent autentisert bruker
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/innlogging?redirectTo=/${locale}/konto`);
  }

  return <LommebokDashboard />
}
