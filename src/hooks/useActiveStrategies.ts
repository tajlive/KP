import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/utils";

export function useActiveStrategies(userId: string | null) {
  return useQuery({
    queryKey: ["strategies", userId, "active"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("strategies" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
