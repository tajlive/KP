"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import { Profile } from "@/types/database";
import { queryKeys } from "@/lib/query-keys";
import { useAuthSafe } from "@/lib/auth/new/AuthContext";

/** Hent user ID uten nettverkskall via AuthContext, fallback til getUser() */
async function getUserId(): Promise<string | null> {
  // Dette kalles utenfor hook-context, så vi leser fra AuthContext via import
  // Ingen hooks her — dette er en ren async funksjon
  return null; // Placeholder — faktisk verdi kommer fra AuthContext
}

async function fetchProfileWithUser(userId: string | null): Promise<Profile | null> {
  const supabase = createClient();
  
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id ?? null;
  }
  if (!uid) return null;
  
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", uid)
    .single();
  if (error) return null;
  return data as Profile;
}

export function useProfileQuery() {
  const queryClient = useQueryClient();
  // Les user fra AuthContext ved render-tid (0 nettverkskall)
  const authUser = useAuthSafe().user;
  
  const query = useQuery({
    queryKey: queryKeys.profile(null),
    queryFn: () => fetchProfileWithUser(authUser?.id ?? null),
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const supabase = createClient();
      
      let userId = authUser?.id ?? null;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      if (!userId) throw new Error("Ikke innlogget");
      
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from("user_profiles")
        .update(payload as never)
        .eq("id", userId)
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
