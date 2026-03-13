import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";

export function useRecentTrades(userId: string | null, limit = 20) {
  return useQuery({
    queryKey: ["trades", userId, "recent", limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id" as unknown, userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
