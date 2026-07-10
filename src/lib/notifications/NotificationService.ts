import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export type NotificationType =
  | "trade_executed"
  | "leaderboard_change"
  | "achievement"
  | "weekly_summary"
  | "system_alert"
  | "price_alert"
  | "signal_new"
  | "signal_executed"
  | "subscription_expiring"
  | "subscription_expired"
  | "achievement_unlocked"
  | "leaderboard_update"
  | "system"
  | "security_alert";

export type NotificationData = Record<
  string,
  string | number | boolean | null | undefined
>;

export class NotificationService {
  constructor(private supabase: SupabaseClient) {}

  async send(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData = {},
  ) {
    try {
      const { error } = await this.supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        body: message,
        data,
        is_read: false,
        read: false,
      });

      if (error) {
        logger.error(
          `Failed to create notification for ${userId}`,
          { error: error.message },
        );
        return false;
      }

      // Forsøk å send push via API hvis det er en viktig type
      if (["trade_executed", "leaderboard_change", "achievement", "weekly_summary"].includes(type)) {
        this.triggerPushNotification(userId, type, title, message, data);
      }

      return true;
    } catch (err) {
      logger.error(
        `NotificationService error: ${(err as Error).message}`,
      );
      return false;
    }
  }

  private async triggerPushNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data: NotificationData = {},
  ) {
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) return;

      // Fire-and-forget — ikke blokker
      void fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/send-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            user_id: userId,
            type,
            title,
            body: message,
            data,
          }),
          signal: AbortSignal.timeout(3000),
        },
      ).catch(() => {
        // Ignorer timeout — push er ikke kritisk
      });
    } catch {
      // Silent fail
    }
  }

  static async create(
    supabase: SupabaseClient,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData = {},
  ) {
    const service = new NotificationService(supabase);
    return service.send(userId, type, title, message, data);
  }
}
