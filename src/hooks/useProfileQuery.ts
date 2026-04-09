"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import { Profile } from "@/types/database";
import { queryKeys } from "@/lib/query-keys";

async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data as Profile;
}

export function useProfileQuery() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.profile(null),
    queryFn: fetchProfile,
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from("user_profiles")
        .update(payload as any)
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tier(null) });
    },
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
