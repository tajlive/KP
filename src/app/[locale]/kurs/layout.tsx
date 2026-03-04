import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('courses.title'),
    description: t('courses.description'),
    alternates: {
      canonical: `/${locale}/kurs`,
      languages: {
        'no': '/no/kurs',
        'en': '/en/kurs',
      },
    },
    openGraph: {
      title: t('courses.title'),
      description: t('courses.description'),
      type: 'website',
      locale: locale === 'no' ? 'nb_NO' : 'en_US',
    },
  };
}

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
