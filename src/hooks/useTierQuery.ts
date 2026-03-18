"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";
import type { TierSlug } from "@/lib/pricing/tiers";
import { normalizeTier } from "@/lib/pricing/tiers";
import { queryKeys } from "@/lib/query-keys";

async function fetchTier(): Promise<{ tier: TierSlug } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("subscription_tier, tier")
    .eq("id", user.id)
    .maybeSingle();
  const raw =
    (data as { subscription_tier?: string; tier?: string } | null)
      ?.subscription_tier ?? (data as { tier?: string } | null)?.tier;
  const tier = normalizeTier(raw);
  return { tier };
}

export function useTierQuery() {
  const query = useQuery({
    queryKey: queryKeys.tier(null),
    queryFn: fetchTier,
    staleTime: 2 * 60 * 1000,
  });
  const tier = (query.data?.tier ?? "student") as TierSlug;
  return {
    tier,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
