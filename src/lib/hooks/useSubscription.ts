'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/utils';
import { TierSlug, TIERS } from '@/lib/pricing/tiers';

interface Subscription {
  id: string;
  tier_slug: TierSlug;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const TIER_ORDER: TierSlug[] = ['student', 'bachelor', 'master', 'phd', 'professor'];

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('subscriptions')
        .select('id, tier_slug, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as any;

      setSubscription(data ?? null);
      setLoading(false);
    }

    fetchSubscription();
  }, []);

  const currentTier = (subscription?.tier_slug ?? 'student') as TierSlug;

  function hasAccess(minTier: TierSlug): boolean {
    return TIER_ORDER.indexOf(currentTier) >= TIER_ORDER.indexOf(minTier);
  }

  return {
    subscription,
    loading,
    currentTier,
    hasAccess,
    tierData: TIERS[currentTier],
    isVip: TIERS[currentTier].vip,
  };
}
