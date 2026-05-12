import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const runtime = 'edge';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('contact.title'),
    description: t('contact.description'),
    alternates: {
      canonical: `/${locale}/kontakt`,
      languages: {
        'no': '/no/kontakt',
        'en': '/en/kontakt',
      },
    },
    openGraph: {
      title: t('contact.title'),
      description: t('contact.description'),
      type: 'website',
      locale: locale === 'no' ? 'nb_NO' : 'en_US',
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
