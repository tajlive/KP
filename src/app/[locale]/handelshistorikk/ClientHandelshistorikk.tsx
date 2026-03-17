'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { SURFACE, BRAND } from '@/lib/design/tokens';

export default function ClientHandelshistorikk() {
  const t = useTranslations('tradeHistory');

  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} p-4 sm:p-8`}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#0A0B0D]">{t('title')}</h1>
          <Button className={BRAND.primary}>Eksporter CSV</Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <p className="text-center text-gray-500 py-12">Ingen trades ennå</p>
        </div>
      </div>
    </div>
  );
}
