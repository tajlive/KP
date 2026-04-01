import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ResolvedLeader = {
  authUserId: string;
  displayName: string | null;
};

/**
 * Canonical leader key for copy_trading_follows (RLS: auth.uid() = leader_id | follower_id).
 * Accepts user_profiles.id, auth.users id (user_profiles.user_id), trader_profiles.id, or leaderboard_bots.id.
 */
export async function resolveLeaderAuthId(
  db: SupabaseClient<Database>,
  rawLeaderKey: string,
): Promise<ResolvedLeader | null> {
  const { data: byProfilePk } = await db
    .from("user_profiles")
    .select("user_id, display_name")
    .eq("id", rawLeaderKey)
    .maybeSingle();

  if (byProfilePk?.user_id) {
    return {
      authUserId: byProfilePk.user_id,
      displayName: byProfilePk.display_name ?? null,
    };
  }

  const { data: byAuthId } = await db
    .from("user_profiles")
    .select("user_id, display_name")
    .eq("user_id", rawLeaderKey)
    .maybeSingle();

  if (byAuthId?.user_id) {
    return {
      authUserId: byAuthId.user_id,
      displayName: byAuthId.display_name ?? null,
    };
  }

  const { data: traderProf } = await db
    .from("trader_profiles")
    .select("user_id, display_name")
    .eq("id", rawLeaderKey)
    .maybeSingle();

  if (traderProf?.user_id) {
    return {
      authUserId: traderProf.user_id,
      displayName: traderProf.display_name ?? null,
    };
  }

  const { data: botByRowId } = await db
    .from("leaderboard_bots")
    .select("user_id")
    .eq("id", rawLeaderKey)
    .maybeSingle();

  const botUserId = botByRowId?.user_id;
  if (botUserId) {
    const { data: prof } = await db
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", botUserId)
      .maybeSingle();
    return {
      authUserId: botUserId,
      displayName: prof?.display_name ?? null,
    };
  }

  return null;
}
