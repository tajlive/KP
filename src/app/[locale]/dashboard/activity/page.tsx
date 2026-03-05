export const dynamic = 'force-dynamic';

import { OrderHistory } from '@/components/trading/OrderHistory';
import { getTranslations } from 'next-intl/server';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function ActivityPage({ params }: PageProps) {
    const { locale: _locale } = await params;
    const t = await getTranslations('dashboard.activityPage');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">{t('title')}</h1>
                <p className="text-slate-400">{t('subtitle')}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <OrderHistory />
            </div>
        </div>
    );
}
