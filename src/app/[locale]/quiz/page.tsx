



import { locales } from '@/i18n/config';
import { QuizClient } from './QuizClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';


export const revalidate = 86400; // 24 hours

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'quizPage' });
    return {
        title: `${t('title')} | Klarpakke`,
        description: t('subtitle'),
    };
}

export default function Page() {
    return <QuizClient />;
}
