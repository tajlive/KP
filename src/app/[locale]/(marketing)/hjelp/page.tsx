



import { HelpClient } from './HelpClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const runtime = 'nodejs';


export const dynamic = "force-dynamic"; // Was: revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'helpPage' });
    return {
        title: `${t('title')} | Klarpakke`,
        description: t('subtitle'),
    };
}

export default function Page() {
    return <HelpClient />;
}
