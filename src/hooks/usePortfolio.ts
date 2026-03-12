import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";

export function usePortfolio(userId: string | null) {
  return useQuery({
    queryKey: ["portfolio", userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, user_id, paper_balance, real_balance, tier")
        .eq("user_id" as any, userId!)
        .single() as any;
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
