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

      // Sjekk Stripe-subscription først
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, tier_slug, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sub) {
        setSubscription(sub as Subscription | null);
        setLoading(false);
        return;
      }

      // Fallback til user_profiles.tier (for manuelt satte tiers som Tom=Professor)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('user_id', user.id)
        .single();

      if (profile?.tier) {
        setSubscription({
          id: 'manual',
          tier_slug: profile.tier as TierSlug,
          status: 'active',
          current_period_end: null,
          cancel_at_period_end: false,
        });
      }

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
