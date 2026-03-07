import { redirect } from 'next/navigation';

export default async function RegistrerPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  redirect(`/${locale}/signup`);
}
