import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// VAPID configuration (lazy initialization)
let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;
  
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@klarpakke.no";
  
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      vapidConfigured = true;
      return true;
    } catch (error) {
      console.error("[notifications/send] Failed to configure VAPID:", error);
      return false;
    }
  }
  return false;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface SendRequest {
  userIds?: string[];
  broadcast?: boolean;
  notification: PushNotificationPayload;
}

/**
 * POST /api/notifications/send
 * Send push notifications to users
 * 
 * Body: {
 *   userIds?: string[],      // Specific users (optional if broadcast)
 *   broadcast?: boolean,     // Send to all subscribers
 *   notification: {
 *     title: string,
 *     body: string,
 *     icon?: string,
 *     badge?: string,
 *     url?: string,
 *     actions?: [{ action: string, title: string }],
 *     requireInteraction?: boolean,
 *     silent?: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin/internal access (using CRON_SECRET or service role)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow service role or CRON_SECRET
    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (process.env.NODE_ENV === "development" && authHeader === "Bearer dev");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate VAPID configuration
    if (!configureVapid()) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    const body: SendRequest = await request.json();
    const { userIds, broadcast, notification } = body;

    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: "Missing notification title or body" },
        { status: 400 }
      );
    }

    if (!broadcast && (!userIds || userIds.length === 0)) {
      return NextResponse.json(
        { error: "Must specify userIds or broadcast" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Build query for subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    
    if (!broadcast && userIds) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: "No active subscriptions found",
      });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icons/icon-192x192.png",
      badge: notification.badge || "/icons/icon-72x72.png",
      url: notification.url || "/",
      actions: notification.actions || [],
      requireInteraction: notification.requireInteraction ?? false,
      silent: notification.silent ?? false,
      timestamp: Date.now(),
    });

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          // If subscription is expired/invalid, delete it
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            return { 
              success: false, 
              endpoint: sub.endpoint, 
              reason: "subscription_expired",
              deleted: true 
            };
          }
          throw error;
        }
      })
    );

    // Analyze results
    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const expired = results.filter(
      (r) => 
        r.status === "fulfilled" && 
        !r.value.success && 
        r.value.reason === "subscription_expired"
    ).length;

    return NextResponse.json({
      success: true,
      sent: succeeded,
      failed,
      expired,
      total: subscriptions.length,
    });

  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get push notification statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (process.env.NODE_ENV === "development" && authHeader === "Bearer dev");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Get subscription counts
    const { count: totalSubscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true });

    const { count: uniqueUsers, error: userError } = await supabase
      .from("push_subscriptions")
      .select("user_id", { count: "exact", head: true });

    if (subError || userError) {
      return NextResponse.json(
        { error: "Failed to fetch statistics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalSubscriptions: totalSubscriptions || 0,
      uniqueUsers: uniqueUsers || 0,
      vapidConfigured: configureVapid(),
    });

  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
