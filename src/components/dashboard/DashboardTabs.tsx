'use client';

import { Home, GraduationCap, TrendingUp, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', labelKey: 'home', icon: Home, href: '/dashboard' },
  { id: 'learn', labelKey: 'learn', icon: GraduationCap, href: '/kurs' },
  { id: 'trade', labelKey: 'trade', icon: TrendingUp, href: '/paper-trading' },
  { id: 'profile', labelKey: 'profile', icon: User, href: '/profile' },
];

export function DashboardTabs() {
  const t = useTranslations('dashboard.tabs');
  const locale = useLocale();
  const pathname = usePathname() ?? '/';

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return href === '/dashboard'
      ? pathname === full
      : pathname.startsWith(full);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-t border-black/[0.06] shadow-[0_-1px_3px_rgba(0,0,0,0.04)] z-50 safe-area-pb">
      <div className="flex justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={`/${locale}${item.href}`}
              className={cn(
                'flex flex-col items-center gap-1 py-3 px-4 transition-colors',
                active ? 'text-[#0052FF]' : 'text-[#8E95A9]',
              )}
            >
              <div
                className={cn(
                  'relative p-2 rounded-xl transition-colors',
                  active && 'bg-[#0052FF]/10',
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">
                {t(item.labelKey, {
                  defaultValue:
                    item.id === 'home' ? 'Hjem'
                    : item.id === 'learn' ? 'Lær'
                    : item.id === 'trade' ? 'Handle'
                    : 'Profil',
                })}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function QuickStats({
  totalValue,
  totalProfit,
  profitPercent,
  activePositions,
  locale = 'no',
}: {
  totalValue: number;
  totalProfit: number;
  profitPercent: number;
  activePositions: number;
  locale?: string;
}) {
  const isNorwegian = locale === 'no';
  const formatNOK = (n: number) =>
    new Intl.NumberFormat(isNorwegian ? 'no-NO' : 'en-US', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(n);

  const stats = [
    {
      label: isNorwegian ? 'Total Verdi' : 'Total Value',
      value: formatNOK(totalValue),
      subtext: `${activePositions} ${isNorwegian ? 'posisjoner' : 'positions'}`,
      color: 'text-white',
    },
    {
      label: isNorwegian ? 'Total Avkastning' : 'Total Return',
      value: formatNOK(totalProfit),
      subtext: `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%`,
      color: profitPercent >= 0 ? 'text-green-400' : 'text-red-400',
      isPositive: profitPercent >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            {stat.label}
          </p>
          <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
          <p
            className={cn(
              'text-sm mt-1',
              stat.isPositive !== undefined
                ? stat.isPositive
                  ? 'text-green-400'
                  : 'text-red-400'
                : 'text-slate-400',
            )}
          >
            {stat.subtext}
          </p>
        </div>
      ))}
    </div>
  );
}
