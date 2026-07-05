import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export type NotificationType = 
  | "system_alert" 
  | "trade_executed" 
  | "portfolio_rebalance_started" 
  | "portfolio_rebalance_completed"
  | "security_alert";

export type NotificationData = Record<string, string | number | boolean | null | undefined>;

export class NotificationService {
  constructor(private supabase: SupabaseClient) {}

  async send(
    userId: string, 
    type: NotificationType, 
    title: string, 
    message: string, 
    data: NotificationData = {}
  ) {
    try {
      const { error } = await this.supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error(`Failed to create notification for ${userId}`, { error: error.message });
        return false;
      }

      // If we have a push service (e.g., Firebase/Resend), we would trigger it here
      // await this.triggerPushNotification(userId, title, message);

      return true;
    } catch (err) {
      logger.error(`NotificationService error: ${(err as Error).message}`);
      return false;
    }
  }

  static async create(supabase: SupabaseClient, userId: string, type: NotificationType, title: string, message: string, data: NotificationData = {}) {
    const service = new NotificationService(supabase);
    return service.send(userId, type, title, message, data);
  }
}
