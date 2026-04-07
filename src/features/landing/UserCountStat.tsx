'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { GlassCard } from '@/shared/ui/GlassCard';
import { formatNumber } from '@/lib/utils/format-number';

interface UserCountResponse {
  count: number;
  cachedAt?: string;
  error?: string;
}

interface UserCountStatProps {
  label: string;
  description: string;
  fallbackValue?: number;
}

const DEFAULT_FALLBACK = 100000; // 100K

export function UserCountStat({
  label,
  description,
  fallbackValue = DEFAULT_FALLBACK,
}: UserCountStatProps) {
  const [data, setData] = useState<UserCountResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserCount() {
      try {
        const response = await fetch('/api/stats/users');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          // Use fallback on error
          setData({ count: fallbackValue });
        }
      } catch (error) {
        console.error('Failed to fetch user count:', error);
        // Use fallback on error
        setData({ count: fallbackValue });
      } finally {
        setLoading(false);
      }
    }

    fetchUserCount();
  }, [fallbackValue]);

  const displayValue = loading ? null : data?.count ?? fallbackValue;
  const formattedValue = displayValue !== null ? formatNumber(displayValue) : null;

  return (
    <GlassCard
      variant="elevated"
      hover="lift"
      padding="md"
      className="group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-kp-surface-highlight text-kp-brand group-hover:text-kp-brand-light transition-colors">
          <TrendingUp className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-kp-text-tertiary bg-kp-surface-highlight px-2 py-1 rounded-badge">
          NOK
        </span>
      </div>
      
      <div className="text-2xl sm:text-3xl font-bold text-kp-text-primary tracking-tight mb-1">
        {loading ? (
          <span className="inline-block w-16 h-8 bg-kp-surface-highlight animate-pulse rounded" />
        ) : (
          formattedValue
        )}
      </div>
      
      <div className="text-sm font-medium text-kp-text-secondary mb-1">
        {label}
      </div>
      
      <div className="text-xs text-kp-text-tertiary">
        {description}
      </div>
    </GlassCard>
  );
}

export default UserCountStat;
