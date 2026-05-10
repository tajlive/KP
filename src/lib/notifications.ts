import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationService, NotificationType } from "./notifications/NotificationService";

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, any> = {}
) {
  return NotificationService.create(supabase, userId, type as NotificationType, title, message, data);
}
