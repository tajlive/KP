import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "system"
  | "signal_new"
  | "signal_executed"
  | "price_alert"
  | "subscription_expiring"
  | "subscription_expired"
  | "achievement_unlocked"
  | "leaderboard_update";

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: data || {},
      is_read: false,
    });

    if (error) {
      console.error(
        "[Notification Helper] Failed to insert notification:",
        error,
      );
    }
  } catch (err) {
    console.error("[Notification Helper] Exception:", err);
  }
}
