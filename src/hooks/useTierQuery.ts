"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";
import type { TierSlug } from "@/lib/pricing/tiers";
import { normalizeTier } from "@/lib/pricing/tiers";
import { queryKeys } from "@/lib/query-keys";
import { useAuthSafe } from "@/lib/auth/new/AuthContext";

async function fetchTierWithUser(userId: string | null): Promise<{ tier: TierSlug } | null> {
  const supabase = createClient();
  
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id ?? null;
  }
  if (!uid) return null;
  
  const { data } = await supabase
    .from("user_profiles")
    .select("subscription_tier, tier")
    .eq("id", uid)
    .maybeSingle();
  const raw =
    (data as { subscription_tier?: string; tier?: string } | null)
      ?.subscription_tier ?? (data as { tier?: string } | null)?.tier;
  const tier = normalizeTier(raw);
  return { tier };
}

export function useTierQuery() {
  const authUser = useAuthSafe().user;
  
  const query = useQuery({
    queryKey: queryKeys.tier(null),
    queryFn: () => fetchTierWithUser(authUser?.id ?? null),
    staleTime: 2 * 60 * 1000,
  });
  const tier = (query.data?.tier ?? "student") as TierSlug;
  return {
    tier,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
