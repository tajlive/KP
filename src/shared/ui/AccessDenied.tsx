'use client';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { ShieldAlert } from 'lucide-react';

export function AccessDenied({ next }: { next?: string }) {
  const locale = useLocale();
  const t = useTranslations('auth');
  const loginUrl = next ? `/${locale}/login?next=${encodeURIComponent(next)}` : `/${locale}/login`;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <ShieldAlert className="w-12 h-12 text-kp-warning mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-kp-text-primary mb-2">{t('accessDenied')}</h1>
        <p className="text-kp-text-secondary mb-6">{t('accessDeniedDesc')}</p>
        <Link href={loginUrl}><Button size="lg">{t('login')}</Button></Link>
      </div>
    </div>
  );
}
