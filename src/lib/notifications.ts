import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationService, NotificationType, NotificationData } from "./notifications/NotificationService";

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  message: string,
  data: NotificationData = {}
) {
  return NotificationService.create(supabase, userId, type as NotificationType, title, message, data);
}
