'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  plan_name: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface SubscriptionStatusProps {
  subscription?: Subscription | null;
  isLoading?: boolean;
  compact?: boolean;
}

const statusConfig = {
  active: {
    icon: CheckCircle2,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    title: 'Aktivt abonnement',
    message: (plan: string) => `Du har ${plan}. Takk for at du støtter oss!`,
  },
  trialing: {
    icon: Clock,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    title: 'Prøveperiode',
    message: () => 'Du er i prøveperioden. Oppgrader når som helst.',
  },
  past_due: {
    icon: AlertCircle,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    title: 'Betaling pågår',
    message: () => 'Vi har problemer med å trekke betalingen. Oppdater betalingskortet.',
  },
  unpaid: {
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    title: 'Betaling mislyktes',
    message: () => 'Abonnementet er satt på pause. Oppdater betalingsinformasjonen.',
  },
  canceled: {
    icon: XCircle,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    title: 'Kansellert',
    message: () => 'Abonnementet er kansellert. Du kan abonnere igjen når som helst.',
  },
  incomplete: {
    icon: AlertCircle,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    title: 'Ufullstendig',
    message: () => 'Betalingen ble ikke fullført. Prøv igjen.',
  },
};

export function SubscriptionStatus({ 
  subscription, 
  isLoading = false,
  compact = false 
}: SubscriptionStatusProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    if (compact) {
      return (
        <Link 
          href="/priser"
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span>Ingen aktiv plan</span>
          <span className="text-[#2563eb]">Oppgrader →</span>
        </Link>
      );
    }

    return (
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-white/40 mt-0.5" />
          <div>
            <p className="font-medium text-white mb-1">Ingen aktiv abonnement</p>
            <p className="text-sm text-white/50 mb-3">
              Du har ikke et aktivt abonnement. Oppgrader for å få tilgang til alle funksjoner.
            </p>
            <Link 
              href="/priser"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#2563eb]/90 transition-colors"
            >
              Se priser
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const config = statusConfig[subscription.status] || statusConfig.incomplete;
  const Icon = config.icon;
  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm text-white/70">{subscription.plan_name}</span>
        {subscription.cancel_at_period_end && daysUntilExpiry <= 7 && (
          <span className="text-xs text-amber-400">(utløper om {daysUntilExpiry} dager)</span>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border"
      style={{ 
        backgroundColor: config.bgColor,
        borderColor: `${config.color}30`,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} style={{ color: config.color }} className="mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-white">{config.title}</p>
            {subscription.plan_name && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70">
                {subscription.plan_name}
              </span>
            )}
          </div>
          <p className="text-sm text-white/60 mb-3">
            {config.message(subscription.plan_name)}
          </p>
          
          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
            <p className="text-xs text-white/40">
              Neste fakturering: {new Date(subscription.current_period_end).toLocaleDateString('nb-NO')}
            </p>
          )}
          
          {subscription.cancel_at_period_end && (
            <p className="text-xs text-amber-400">
              Abonnementet utløper om {daysUntilExpiry} dager
            </p>
          )}

          {(subscription.status === 'past_due' || subscription.status === 'unpaid') && (
            <Link
              href="/innstillinger/billing"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#2563eb]/90 transition-colors"
            >
              <RefreshCw size={14} />
              Oppdater betaling
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
